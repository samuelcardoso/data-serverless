/* eslint-disable object-shorthand */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-alert */
const RecordRTC = require('recordrtc');
const { createFFmpeg } = require('@ffmpeg/ffmpeg');
const { putMedia } = require('./putMediaCall');

const ffmpeg = createFFmpeg({ log: true });

let recording = false;

const downloadURL = function(data, fileName) {
  var a;
  a = document.createElement('a');
  a.href = data;
  a.download = fileName;
  document.body.appendChild(a);
  a.style = 'display: none';
  a.click();
  a.remove();
};

async function transformVideo(videoUint8Array, streamName, h264) {
  const currrentTime = Date.now();
  await ffmpeg.write('record', videoUint8Array);
  // if (h264) {
  //   await ffmpeg.run(`-i record -c:v copy -acodec aac -threads 8 ${streamName}-${currrentTime}.mkv`);
  // } else {
    await ffmpeg.run(`-i record -vcodec h264 -acodec aac -threads 8 ${streamName}-${currrentTime}.mkv`);
  // }
  const videoFile = await ffmpeg.read(`${streamName}-${currrentTime}.mkv`);

  const blob = new Blob(videoFile, {
    type: 'video/x-matroska'
  });
  const url = window.URL.createObjectURL(blob);
  downloadURL(url, `${streamName}-${currrentTime}.mkv`);

  return videoFile;// uint8array
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function getBlobFromFile(service, region, accessKeyID, secretAccessKey, sessionToken,
  dataEndpoint, streamName, inputFile, h264) {
  await ffmpeg.load();
  const reader = new FileReader();

  async function fileReaderOnload(e) {
    try {
      const uint8Array = new Uint8Array(e.target.result);
      const videoFile = await transformVideo(uint8Array, streamName, h264);
      await putMedia(videoFile, service, region, accessKeyID,
        secretAccessKey, sessionToken, dataEndpoint, streamName);
    } catch (error) {
      alert(`The following error occurred\n${error}\nPlease reload the page and try again with a valid file`);
    }
  }

  function fileReaderOnError() {
    alert(`Failed to read file!\n${reader.error}`);
    reader.abort();
  }

  reader.onerror = fileReaderOnError;
  reader.onload = fileReaderOnload;
  reader.readAsArrayBuffer(inputFile);
}

function stopRecording() {
  recording = false;
}

async function getBlobFromWebcam(service, region, accessKeyID, secretAccessKey, sessionToken,
  dataEndpoint, streamName, audio, height, width, frameRate, latency,
  webcam = null) {
  await ffmpeg.load();
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: true
  });

  if (webcam) {
    // eslint-disable-next-line no-param-reassign
    webcam.srcObject = stream;
    await webcam.play();
  }

  const recorder = RecordRTC(stream, {
    type: 'video',
    mimeType: 'video/webm;codecs=h264',
    // timeSlice: 1000,
    // bitsPerSecond: 128000,
    // videoBitsPerSecond: 128000,
    // frameInterval: 10,
    // video: HTMLVideoElement,
    // canvas: {
    //   width: 640,
    //   height: 480
    // },
    // frameRate: 30,
    // bitrate: 128000
    // frameInterval: 1,
    frameRate: 100
  });
  recorder.startRecording();
  recording = true;

  let uint8Array = [];
  async function getAndSendFrame() {
    recorder.stopRecording(async () => {
      uint8Array = new Uint8Array(await recorder.getBlob().arrayBuffer());
    });

    recorder.startRecording();

    if (uint8Array.length > 0) {
      try {
        const videoFile = await transformVideo(uint8Array, streamName, true);
        await putMedia(videoFile, service, region, accessKeyID,
          secretAccessKey, sessionToken, dataEndpoint, streamName);
      } catch (error) {
        stopRecording();
        alert(`The following error occurred\n${error}\nPlease reload the page and try again`);
      }
    }
  }
  while (recording) {
    await getAndSendFrame();
    await sleep(latency);
  }
}

module.exports = {
  getBlobFromWebcam, getBlobFromFile, transformVideo, stopRecording,
};