import { useEffect, useRef, useState } from 'react'
import './App.css'
import * as faceapi from 'face-api.js'

type EllipseMaskProps = {
  x: number
  y: number
  radiusX: number
  radiusY: number
  context: CanvasRenderingContext2D


}

class EllipseMask {
  x: number
  y: number
  radiusX: number
  radiusY: number
  context: CanvasRenderingContext2D

  constructor (props: EllipseMaskProps ){
    this.x = props.x
    this.y = props.y
    this.radiusX = props.radiusX
    this.radiusY = props.radiusY
    this.context = props.context
  }

  message (text: string) {
    const canvasCenterPosition = this.context.canvas.width/2
    const positionY = this.y + this.radiusY + 20

    this.context.font = "24px serif"
    this.context.textAlign = "center"
    this.context.fillText(text, canvasCenterPosition, positionY, this.context.canvas.width - 10)
  }

  draw () {
    this.context.beginPath()
    this.context.ellipse(this.x, this.y, this.radiusX, this.radiusY, 0, 0, Math.PI*2)
    this.context.stroke()    
  }

  error (text: string) {
    this.context.strokeStyle = 'red' 
    this.context.lineWidth = 5
    this.draw()
    this.message(text)
  }

  success () {
    this.context.strokeStyle = 'green' 
    this.context.lineWidth = 5
    this.draw()
  }

  isPointInsideMask (  pointX: number, pointY: number) {
    const distanceX = Math.abs(pointX - this.x)
    const distanceY = Math.abs(pointY - this.y)

    const isInside = ((Math.pow(distanceX, 2) /  Math.pow(this.radiusX, 2)) + (Math.pow(distanceY, 2) / Math.pow(this.radiusY, 2))) <= 1
    return isInside 
  }


  isFaceBoxInsideMask (face: faceapi.Box): string {
    const {bottomLeft, bottomRight, topLeft, topRight} = face
    const points = [bottomLeft, bottomRight, topLeft, topRight]
    const result = points.every(point => this.isPointInsideMask(point.x, point.y))

    if (result) return ''
    return 'Ajuste seu rosto para área demarcada'
  }

  isFacelPointsInsideMask (points: faceapi.Point[]): string {
    const result = points.every(point => this.isPointInsideMask(point.x, point.y))

    if (result) return ''
    return 'Ajuste seu rosto para área demarcada'
  }
}

function App() {
  const videoRef =  useRef<HTMLVideoElement>(null)
  const faceApiCanvasRef = useRef<HTMLCanvasElement>(null)
  const maskFrameCanvasRef = useRef<HTMLCanvasElement>(null)

  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [captureVideo, setCaptureVideo] = useState(false)
  const [intervalRef, setintervalRef] = useState< ReturnType<typeof setInterval> | null>(null)

  const videoHeight = 480
  const videoWidth = 640

  
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL =  '/models'
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        setModelsLoaded(true)
      } catch (err) {
        console.log
      }
    }

    loadModels()
  }, [])

  const startVideo = () => {
    setCaptureVideo(true)
    console.log({
      navigator: navigator.mediaDevices
    })
    navigator?.mediaDevices?.getUserMedia({ video: { width: 300 } })
    .then(stream => {
      const video = videoRef.current
      if(!video) throw new Error('Não foi possível encontrar o video.')
        video.srcObject = stream
        video.play()
      })
      .catch(err => {
        console.error(`Error [startVideo]: ${err}`)
      })
  }

  const closeWebcam = () => {
    try {
      const video = videoRef.current
      if (!video) throw new Error('Não foi possível encontrar o video.')
      video.pause()
      if (video.srcObject && 'getTracks' in video.srcObject) video.srcObject.getTracks()[0].stop()
      
      if (intervalRef) {
        clearInterval(intervalRef)
        setintervalRef(null)
      }
      setCaptureVideo(false)
    } catch (err) {
      console.log(err)
    }
  }


  const handleVideoOnPlay = () => {
    const canvas =  faceApiCanvasRef.current
    const video = videoRef.current

    if (!canvas) throw new Error('Não foi possível encontrar o canvas')
    if (!video) throw new Error('Não foi possível encontrar o video')
        
    const canvasContext = canvas.getContext('2d')
    if (!canvasContext) throw new Error('Não foi possível encontrar o context do canvas')

    const ellipseMask = new EllipseMask({
      x:videoWidth/2, 
      y: videoHeight/2, 
      radiusX: videoWidth/5,
      radiusY: videoHeight/2.75,
      context: canvasContext,
    })
    
    const displaySize = {
      width: videoWidth,
      height: videoHeight
    }


    const interval = setInterval(async () => {
      try {

        faceapi.matchDimensions(canvas, displaySize)
        
        const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks()
        if (!detections) return ellipseMask.error('Não foi possível localizar seu rosto.')
        
        const resizedDetections = faceapi.resizeResults(detections, displaySize)
        if (!resizedDetections) throw new Error('Não foi possível enquadrar o rosto.')

        const errorMessage = ellipseMask.isFacelPointsInsideMask(resizedDetections.landmarks.positions)
        if (errorMessage) return ellipseMask.error(errorMessage)
      
        ellipseMask.success()
        
      } catch (err) {
        console.log(err)
      }
    }, 1000)

    setintervalRef(interval)
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
                <canvas ref={faceApiCanvasRef} style={{ position: 'absolute' }} />
                <canvas ref={maskFrameCanvasRef} style={{ position: 'absolute' }} />
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
