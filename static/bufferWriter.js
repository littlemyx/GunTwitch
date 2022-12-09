const mediasource2 = new MediaSource();
const video2 = document.querySelector("#video2");
const mime = "video/webm;codecs=vp9,opus";
video2.src = URL.createObjectURL(mediasource2);

let source2;
let recorder;

const gun = Gun();

mediasource2.addEventListener("sourceopen", function (_) {
  source2 = mediasource2.addSourceBuffer(mime);
});

const start_button = document.querySelectorAll("#start")[0];
const stop_button = document.querySelectorAll("#stop")[0];

stop_button.addEventListener("click", () => {
  mediasource2.endOfStream();
  recorder.stop();
});

const blobtoBase64 = blob =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });

const base64ToBlob = dataURI => {
  // convert base64 to raw binary data held in a string
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  const byteString = atob(dataURI.split(",")[1]);

  // separate out the mime component
  const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];

  // write the bytes of the string to an ArrayBuffer
  const ab = new ArrayBuffer(byteString.length);

  // create a view into the buffer
  const ia = new Uint8Array(ab);

  // set the bytes of the buffer to the correct values
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  // write the ArrayBuffer to a blob, and you're done
  const blob = new Blob([ab], { type: "audio/webm;codecs=opus" });
  return blob;
};

function blobToBuffer(blob, cb) {
  if (typeof Blob === "undefined" || !(blob instanceof Blob)) {
    throw new Error("first argument must be a Blob");
  }
  if (typeof cb !== "function") {
    throw new Error("second argument must be a function");
  }

  const reader = new FileReader();

  function onLoadEnd(e) {
    reader.removeEventListener("loadend", onLoadEnd, false);
    if (e.error) cb(e.error);
    else cb(null, ethereumjs.Buffer.Buffer.from(reader.result));
  }

  reader.addEventListener("loadend", onLoadEnd, false);
  reader.readAsArrayBuffer(blob);
}

let iteration = 0;

start_button.addEventListener("click", () => {
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .then(stream => {
      recorder = new MediaRecorder(stream, { mimeType: mime });
      recorder.ondataavailable = async event => {
        blobToBuffer(event.data, function (err, buffer) {
          if (err) throw err;

          const serializedBuffer = String.fromCharCode.apply(null, buffer);

          gun
            .get("muhin_video_test_1")
            .get("video")
            .get(iteration)
            .put(serializedBuffer);

          iteration += 1;
          // iteration %= 30;
        });
      };
      recorder.start(100);
    });
});
