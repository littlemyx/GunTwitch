const mediasource = new MediaSource();
const video = document.querySelector("video");
const mime = "video/webm;codecs=vp9,opus";

let iteration = 0;
const gun = Gun();
const queue = [];
let buffer;

video.src = URL.createObjectURL(mediasource);

async function renderSource(value) {
  console.log(value);
  const arrayBuffer = await (await fetch(value)).arrayBuffer();
  buffer.appendBuffer(arrayBuffer);
}

function gunRead(index) {
  gun
    .get("muhin_video_test_1")
    .get("video")
    .get(index)
    .once(async value => {
      if (value === undefined) {
        return;
      }
      if (buffer.updating || queue.length > 0) {
        queue.push(value);
      } else {
        await renderSource(value);
      }

      let event = new Event("hello", { bubbles: true }); // (2)
      document.dispatchEvent(event);
    });
}

// catch on document...
document.addEventListener("hello", function (event) {
  iteration += 1;
  gunRead(iteration);
});

mediasource.addEventListener("sourceopen", () => {
  buffer = mediasource.addSourceBuffer(mime);
  buffer.addEventListener("update", function () {
    // Note: Have tried 'updateend'
    if (queue.length > 0 && !buffer.updating) {
      renderSource(queue.shift());
    }
  });
  gunRead(iteration);
});

const play_button = document.querySelectorAll("#play")[0];
play_button.addEventListener("click", () => {
  video.play();
});

///////////////////////

function falsish() {
  var mediasource = new MediaSource(),
    video = document.querySelector("video"),
    mime = "video/webm;codecs=vp9,opus";
  video.src = URL.createObjectURL(mediasource);

  mediasource.addEventListener("sourceopen", function (_) {
    var source = mediasource.addSourceBuffer(mime);
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(stream => {
        var recorder = new MediaRecorder(stream, { mimeType: mime });
        recorder.ondataavailable = d => {
          var r = new Response(d.data).arrayBuffer(); // convert blob to arraybuffer
          r.then(arraybuffer => {
            source.appendBuffer(arraybuffer);
          });
        };
        recorder.start(5000);
      });
  });
}
