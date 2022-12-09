let mediaRecorder;
let clip = [];
let m3u8;
let ts;

const PERIOD = 3 * 1000;

const { createFFmpeg } = FFmpeg;

// create the FFmpeg instance and load it
const ffmpeg = createFFmpeg({ log: true });
ffmpeg.load();

function download_playlist(index = 0) {
  const playlist_buffer = ffmpeg.FS("readFile", "hls_master_for_test.m3u8");
  const playlist = new Blob([playlist_buffer.buffer], { type: "video/webm" });
  downloadBlob(playlist, `playlist_${index}.m3u8`, "text/plain");
}

function start_webcam(onDataAvailable, onPeriodTic, onStop) {
  var constraints = {
    // audio: true,
    audio: false,
    video: {
      width: { min: 640, ideal: 640, max: 640 },
      height: { min: 640, ideal: 640, max: 640 }
    }
  };
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(function (stream) {
      const options = {
        // audioBitsPerSecond: 128000,
        // videoBitsPerSecond: 2500000,
        // mimeType: "video/webm;codecs=vp9"
        mimeType: "video/webm;codecs=opus,vp8"
        // mimeType: "video/x-matroska;codecs=avc1,opus"
      };
      mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorder.start(PERIOD);

      // const mediaTimerId = setInterval(onPeriodTic, PERIOD);

      mediaRecorder.onstop = function (e) {
        // clearInterval(mediaTimerId);
        onStop();
      };

      mediaRecorder.ondataavailable = onDataAvailable;
    })
    .catch(function (err) {
      console.log("The following error occured: " + err);
    });
}

async function dataAvailableHandler(e) {
  console.log(e.data);
  clip.push(e.data);
  mediaRecorder.stop();
  await periodTicHandler(e.data);
  clip = [];
  //chunks.push(e.data);
}

let intervalNumber = 0;

async function periodTicHandler(clip) {
  const tmp_clip = clip;
  // clip = [];
  await save_clip(tmp_clip);

  // download_playlist(intervalNumber);

  intervalNumber += 1;
}

function stopHandler() {
  intervalNumber = 0;
}

function start_recording() {
  intervalNumber = 0;
  clip = [];

  start_webcam(dataAvailableHandler, periodTicHandler, stopHandler);
}

var downloadBlob, downloadURL;

downloadBlob = function (data, fileName, mimeType) {
  var blob, url;
  blob = new Blob([data], {
    type: mimeType
  });
  url = window.URL.createObjectURL(blob);
  downloadURL(url, fileName);
  setTimeout(function () {
    return window.URL.revokeObjectURL(url);
  }, 1000);
};

downloadURL = function (data, fileName) {
  var a;
  a = document.createElement("a");
  a.href = data;
  a.download = fileName;
  document.body.appendChild(a);
  a.style = "display: none";
  a.click();
  a.remove();
};

const video_element = document.querySelectorAll("#video")[0];

async function save_clip(raw_data) {
  console.log(raw_data);
  const blob = new Blob([raw_data], { type: "video/webm" });
  const url = window.URL.createObjectURL(blob);

  currentSrc = video_element.currentSrc;
  video_element.src = ""; // data url
  // URL.revokeObjectURL(currentSrc);

  // video_element.src = url; // data url
  // video_element.load();
  // video_element.play();

  // fetch the AVI file
  const sourceBuffer = await blob.arrayBuffer();

  console.log(sourceBuffer);

  // write the AVI to the FFmpeg file system
  ffmpeg.FS(
    "writeFile",
    "clip.webm",
    new Uint8Array(sourceBuffer, 0, sourceBuffer.byteLength)
  );

  // run the FFmpeg command-line tool, converting the AVI into an MP4
  await ffmpeg.run(
    `-i`,
    `clip.webm`,
    // `-f`,
    // `webm`,
    `-hls_time`,
    `1`,
    `-benchmark`,
    `-filter:v`,
    `fps=fps=10`,
    `-hls_flags`,
    `independent_segments+append_list`,
    `-hls_list_size`,
    `10`,
    `-hls_segment_filename`,
    "video_segments_%0d.ts",
    `hls_master_for_test.m3u8`
    // `-hls_time`,
    // `3`,
    // `-benchmark`,
    // `-hls_list_size`,
    // `1`,
    // `-filter:v`,
    // `fps=fps=10`,
    // `-hls_segment_filename`,
    // `video_segments_%0d.ts`,
    // `hls_master_for_test.m3u8`,
    // `-f`,
    // `hls`,
    // `-hls_flags`,
    // `independent_segments+append_list`,
    // `-hls_segment_type`,
    // `mpegts`,
    // `-master_pl_name`,
    // `master.m3u8`
  );

  // read the MP4 file back from the FFmpeg file system

  const playlist = ffmpeg.FS("readFile", "hls_master_for_test.m3u8");
  // const video = ffmpeg.FS("readFile", "video_segments_0.ts");

  m3u8 = new Blob([playlist.buffer], { type: "plain/text" });
  // ts = new Blob([video.buffer], { type: "video/webm" });

  console.log(await m3u8.text());
  // console.log(video);
  // clip = [];
}

function download_videos(from = 0) {
  const filenames = ffmpeg
    .FS("readdir", ".")
    .filter(item => item.includes("video_segments_"));

  const videos = [];

  for (let i = from; i < filenames.length; i++) {
    const video_buffer = ffmpeg.FS("readFile", `video_segments_${i}.ts`);
    const video = new Blob([video_buffer.buffer], { type: "video/webm" });

    videos.push(video);
  }

  videos.forEach((video, index) => {
    downloadBlob(video, `video_segments_${index}.ts`, "video/webm");
  });
}

function save() {
  download_videos();

  download_playlist(intervalNumber);
}

const start_button = document.querySelectorAll("#start")[0];
const stop_button = document.querySelectorAll("#stop")[0];
const save_button = document.querySelectorAll("#save")[0];
const download_button = document.querySelectorAll("#download")[0];
const play_button = document.querySelectorAll("#play")[0];

play_button.addEventListener("click", () => {
  video_element.play();
});
save_button.addEventListener("click", save_clip);
start_button.addEventListener("click", start_recording);
stop_button.addEventListener("click", () => {
  mediaRecorder.stop();
  // download_videos();
});
download_button.addEventListener("click", save);
