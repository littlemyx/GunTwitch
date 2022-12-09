const mediasource1 = new MediaSource();
const mediasource2 = new MediaSource();
const video1 = document.querySelector("#video1");
const video2 = document.querySelector("#video2");
const mime = "video/webm;codecs=vp9,opus";
video1.src = URL.createObjectURL(mediasource1);
video2.src = URL.createObjectURL(mediasource2);

let source1;
let source2;
let recorder;

mediasource1.addEventListener("sourceopen", function (_) {
  source1 = mediasource1.addSourceBuffer(mime);
});
mediasource2.addEventListener("sourceopen", function (_) {
  source2 = mediasource2.addSourceBuffer(mime);
});

const start_button = document.querySelectorAll("#start")[0];
const stop_button = document.querySelectorAll("#stop")[0];

stop_button.addEventListener("click", () => {
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

start_button.addEventListener("click", () => {
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .then(stream => {
      recorder = new MediaRecorder(stream, { mimeType: mime });
      recorder.ondataavailable = async event => {
        blobToBuffer(event.data, function (err, buffer) {
          if (err) throw err;

          const serializedBuffer = String.fromCharCode.apply(null, buffer);
          const restorredBuffer = Uint8Array.from(serializedBuffer, x =>
            x.charCodeAt(0)
          );
          console.log(serializedBuffer);

          const arrayBuffer = restorredBuffer.buffer.slice(
            restorredBuffer.byteOffset,
            restorredBuffer.byteOffset + restorredBuffer.byteLength
          );
          source1.appendBuffer(arrayBuffer);
        });
        // // var hightArrayBuffer = await (await fetch(d.data)).arrayBuffer(); // convert blob to arraybuffer
        // const reader = new FileReader();
        // reader.onload = async function () {
        //   const blob = dataURItoBlob(
        //     reader.result.replace(/^data:.*;base64,/, "")
        //   );
        //   console.log("my blob", blob);
        //   var r = new Response(blob).arrayBuffer(); // convert blob to arraybuffer
        //   r.then(arraybuffer => {
        //     console.log("my array buffer", arraybuffer);
        //     source1.appendBuffer(arraybuffer);
        //   });
        // };
        // reader.readAsDataURL(d.data);
        // console.log("their ugly blob", d.data);
        // var r = new Response(d.data).arrayBuffer(); // convert blob to arraybuffer
        // r.then(arraybuffer => {
        //   console.log("their ugly array buffer", arraybuffer);
        //   source2.appendBuffer(arraybuffer);
        // });
      };
      recorder.start(100);
      video1.play();
      video2.play();
    });
});
