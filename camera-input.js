let mediaRecorder;
let clip = [];
let m3u8;
let ts;
let mediaTimerId;
let saveTimerId;
let iteration = 0;

const PERIOD = 3 * 1000;

function start_recording() {
  var constraints = {
    audio: true,
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
        mimeType: "video/webm;codecs=vp9"
        // mimeType: "video/x-matroska;codecs=avc1,opus"
      };
      mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorder.start(0);

      mediaRecorder.onstop = function (e) {
        // stream.stop();
        clearInterval(mediaTimerId);
      };
      //document.getElementById('button_start').disabled=false;

      mediaRecorder.ondataavailable = function (e) {
        // console.log(e.data);
        clip.push(e.data);
        //chunks.push(e.data);
      };

      mediaTimerId = setInterval(() => {
        console.log("clip cleared by recorder");
        clip = [];
      }, PERIOD);
    })
    .catch(function (err) {
      console.log("The following error occured: " + err);
    });
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

async function save_clip(clip_as_array_buffer) {
  const { createFFmpeg } = FFmpeg;
  // create the FFmpeg instance and load it
  const ffmpeg = createFFmpeg({ log: true });
  await ffmpeg.load();

  // write the AVI to the FFmpeg file system
  ffmpeg.FS(
    "writeFile",
    "clip.webm",
    new Uint8Array(clip_as_array_buffer, 0, clip_as_array_buffer.byteLength)
  );

  // run the FFmpeg command-line tool, converting the AVI into an MP4
  await ffmpeg.run(
    `-i`,
    `clip.webm`,
    `-hls_time`,
    `3`,
    `-benchmark`,
    `-hls_list_size`,
    `1`,
    `-filter:v`,
    `fps=fps=10`,
    `-hls_segment_filename`,
    `video_segments_%0d.ts`,
    `hls_master_for_test.m3u8`,
    `-f`,
    `hls`,
    `-hls_flags`,
    `independent_segments+append_list`,
    `-hls_segment_type`,
    `mpegts`
  );

  // read the MP4 file back from the FFmpeg file system
  const playlist = ffmpeg.FS("readFile", "hls_master_for_test.m3u8");
  const video = ffmpeg.FS("readFile", `video_segments_${iteration}.ts`);

  m3u8 = new Blob([playlist.buffer], { type: "video/mp4" });
  ts = new Blob([video.buffer], { type: "video/mp4" });

  iteration += 1;

  return [m3u8, ts];
}

const start_button = document.querySelectorAll("#start")[0];
const stop_button = document.querySelectorAll("#stop")[0];
const save_button = document.querySelectorAll("#save")[0];
const continious_save_button = document.querySelectorAll("#continious_save")[0];
const download_button = document.querySelectorAll("#download")[0];

continious_save_button.addEventListener("click", () => {
  clearInterval(mediaTimerId);
  saveTimerId = setInterval(async () => {
    console.log("start saving");
    const slice = clip;
    clip = [];

    const blob = new Blob(slice, { type: "video/webm" });
    const url = window.URL.createObjectURL(blob);

    video_element.src = url; // data url
    video_element.play();

    // fetch the AVI file
    const sourceBuffer = await blob.arrayBuffer();

    const [m3u8, ts] = await save_clip(sourceBuffer);
    downloadBlob(m3u8, "playlist.m3u8", "text/plain");
    downloadBlob(ts, `video_segments_${iteration}.ts`, "video/webm");
  }, PERIOD);
});
save_button.addEventListener("click", async () => {
  const slice = clip;

  const blob = new Blob(slice, { type: "video/webm" });
  const url = window.URL.createObjectURL(blob);

  video_element.src = url; // data url
  video_element.play();

  // fetch the AVI file
  const sourceBuffer = await blob.arrayBuffer();

  const [m3u8, ts] = await save_clip(sourceBuffer);
  downloadBlob(m3u8, "playlist.m3u8", "text/plain");
  downloadBlob(ts, `video_segments_${iteration}.ts`, "video/webm");
});
start_button.addEventListener("click", start_recording);
stop_button.addEventListener("click", () => {
  clearInterval(saveTimerId);
  mediaRecorder.stop();
});
download_button.addEventListener("click", () => {
  downloadBlob(m3u8, "playlist.m3u8", "text/plain");
  downloadBlob(ts, "video_segments_0.ts", "video/webm");
});
