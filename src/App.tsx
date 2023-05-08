import { useEffect, useRef, useState } from 'react'
import './App.css'
import faceapi from 'face-api.js'


function App() {
  const videoRef =  useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [captureVideo, setCaptureVideo] = useState(false)

  const videoHeight = 480
  const videoWidth = 640
  
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL =  '../public/models'

      Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ])
      .then(() => setModelsLoaded(true))
    }

    loadModels()
  }, [])

  const startVideo = () => {
    setCaptureVideo(true)
    navigator?.mediaDevices
      .getUserMedia({ video: { width: 300 } })
      .then(stream => {
        const video = videoRef.current
        if(!video) throw new Error('Não foi possível encontrar o video.')
        video.srcObject = stream
        video.play()
      })
      .catch(err => {
        console.error("error:", err)
      })
  }

  const handleVideoOnPlay = () => {
    setInterval(async () => {
      try {
        const canvas =  canvasRef.current
        const video = videoRef.current

        if (!canvas) throw new Error('')
        if (!video) throw new Error('')

        
        canvas.innerHTML = faceapi.createCanvasFromMedia(video) as any 
        const displaySize = {
          width: videoWidth,
          height: videoHeight
        }

        faceapi.matchDimensions(canvas, displaySize)

        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions()

        const resizedDetections = faceapi.resizeResults(detections, displaySize)

        canvas.getContext('2d')?.clearRect(0, 0, videoWidth, videoHeight)
        faceapi.draw.drawDetections(canvas, resizedDetections)
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections)
        
      } catch (err) {
        console.log(err)
      }
    }, 100)
  }

  const closeWebcam = () => {
    try {
      const video = videoRef.current
      if (!video) throw new Error('Não foi possível encontrar o video.')
      video.pause()
      // video.srcObject?.getTracks()[0].stop()
      setCaptureVideo(false)
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <div>
      <div style={{ textAlign: 'center', padding: '10px' }}>
        {
          captureVideo && modelsLoaded ?
            <button onClick={closeWebcam} style={{ cursor: 'pointer', backgroundColor: 'green', color: 'white', padding: '15px', fontSize: '25px', border: 'none', borderRadius: '10px' }}>
              Close Webcam
            </button>
            :
            <button onClick={startVideo} style={{ cursor: 'pointer', backgroundColor: 'green', color: 'white', padding: '15px', fontSize: '25px', border: 'none', borderRadius: '10px' }}>
              Open Webcam
            </button>
        }
      </div>
      {
        captureVideo ?
          modelsLoaded ?
            <div>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}>
                <video ref={videoRef} height={videoHeight} width={videoWidth} onPlay={handleVideoOnPlay} style={{ borderRadius: '10px' }} />
                <canvas ref={canvasRef} style={{ position: 'absolute' }} />
              </div>
            </div>
            :
            <div>loading...</div>
          :
          <>
          </>
      }
    </div>
  )
}

export default App
