const { createFFmpeg } = FFmpeg;

const button = document.getElementById("play_video");
button.setAttribute("disabled", "");

const ffmpeg = createFFmpeg({ log: true });
button;
ffmpeg.load().then(() => {
  button.removeAttribute("disabled");
});

async function start() {
  // fetch the AVI file
  const sourceBuffer = await fetch("file_example_MP4_1280_10MG.mp4").then(r =>
    r.arrayBuffer()
  );

  // create the FFmpeg instance and load it

  // write the AVI to the FFmpeg file system
  ffmpeg.FS(
    "writeFile",
    "file_example_MP4_1280_10MG.mp4",
    new Uint8Array(sourceBuffer, 0, sourceBuffer.byteLength)
  );

  // run the FFmpeg command-line tool, converting the AVI into an MP4
  await ffmpeg.run(
    "-i",
    "file_example_MP4_1280_10MG.mp4",
    "-hls_time",
    "1",
    "-benchmark",
    "-filter:v",
    "fps=fps=10",
    "-hls_flags",
    "independent_segments+append_list",
    "-hls_list_size",
    "10",
    "-hls_segment_filename",
    "video_segments_%0d.ts",
    "hls_master_for_test.m3u8"

    //////////////////

    // `-i`,
    // `file_example_MP4_1280_10MG.mp4`,
    // `-hls_time`,
    // `1`,
    // `-benchmark`,
    // `-filter:v`,
    // `fps=fps=10`,
    // `-hls_flags`,
    // `independent_segments+append_list`,
    // `-hls_list_size`,
    // `10`,
    // `-hls_segment_filename`,
    // "video_segments_%0d.ts",
    // `hls_master_for_test.m3u8`
    //////////////////////

    // `-i`,
    // `file_example_MP4_1280_10MG.mp4`,
    // `-hls_time`,
    // `3`,
    // `-benchmark`,
    // `-hls_list_size`,
    // `1`,
    // `-hls_segment_filename`,
    // `"video_segments_%0d.ts"`,
    // `hls_master_for_test.m3u8`,
    // `-f`,
    // `hls`,
    // `-hls_flags`,
    // `independent_segments`,
    // `-hls_segment_type`,
    // `mpegts`,
    // `-master_pl_name`,
    // `master.m3u8`
  );

  // read the MP4 file back from the FFmpeg file system
  const output = ffmpeg.FS("readFile", "hls_master_for_test.m3u8");

  const m3u8 = await new Blob([output.buffer], { type: "video/mp4" }).text();

  console.log(m3u8);

  console.log(ffmpeg.FS("readdir", "."));
}

button.addEventListener("click", start);
