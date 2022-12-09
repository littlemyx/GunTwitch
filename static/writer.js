const mediasource = new MediaSource();
const mime = "video/webm;codecs=vp9,opus";

let iteration = 0;

let recorder;
const gun = Gun();

const start_button = document.querySelectorAll("#start")[0];
const stop_button = document.querySelectorAll("#stop")[0];

const magicNumber = parseInt(0x1f43b675);

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

let offset = -1;
let value = 0;

start_button.addEventListener("click", () => {
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .then(stream => {
      recorder = new MediaRecorder(stream, { mimeType: mime });
      recorder.ondataavailable = async ({ data }) => {
        // var r = new Response(data).arrayBuffer(); // convert blob to arraybuffer
        // r.then(arraybuffer => {
        //   console.log("their ugly array buffer", arraybuffer);
        // });

        downloadBlob(
          new Blob([data], { type: "video/webm" }),
          "clip.webm",
          "video/webm"
        );

        while (value !== magicNumber) {
          offset = offset + 1;

          try {
            const arr = await data
              .slice(offset, offset + 4)
              .arrayBuffer()
              .then(buffer => new Int32Array(buffer));

            value = arr[0];
          } catch (error) {
            return;
          }
        }

        const reader = new FileReader();
        reader.onload = function () {
          console.log("reader result", reader.result);
          // gun
          //   .get("muhin_video_test_1")
          //   .get("video")
          //   .get(iteration)
          //   .put(reader.result);

          // iteration += 1;
        };
        reader.readAsBinaryString(data);
      };
      recorder.start(5000);
    });
});

stop_button.addEventListener("click", () => {
  recorder.stop();
});
