const mediasource = new MediaSource();
const video = document.querySelector("#video1");
const mime = "video/webm;codecs=vp9,opus";

let iteration = 0;
const gun = Gun();
const queue = [];
let buffer;

video.src = URL.createObjectURL(mediasource);

async function renderSource(value) {
  console.log(value);
  const restorredBuffer = Uint8Array.from(value, x => x.charCodeAt(0));

  const arrayBuffer = restorredBuffer.buffer.slice(
    restorredBuffer.byteOffset,
    restorredBuffer.byteOffset + restorredBuffer.byteLength
  );
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
      setTimeout(() => {
        document.dispatchEvent(event);
      });
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
  buffer.addEventListener("updateend", function () {
    if (queue.length > 0) {
      renderSource(queue.shift());
    }
  });
  gunRead(iteration);
});

const play_button = document.querySelectorAll("#play")[0];
play_button.addEventListener("click", () => {
  video.play();
});

const stop_button = document.querySelectorAll("#stop")[0];
stop_button.addEventListener("click", () => {
  mediasource.endOfStream();
});
