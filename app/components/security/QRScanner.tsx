'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle, Loader, Camera, X } from 'lucide-react'

interface QRScanResult {
    studentName: string
    rollNumber: string
    outpassId: string
    exitTime: string
    returnTime: string
    status: string
}

export default function QRScanner() {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isScannerActive, setIsScannerActive] = useState(false)
    const [scanning, setScanning] = useState(false)
    const [result, setResult] = useState<QRScanResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [cameraPermission, setCameraPermission] = useState<boolean | null>(null)

    // Initialize camera only when user wants to scan
    useEffect(() => {
        if (!isScannerActive) return

        const initCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                })
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    setScanning(true)
                    setCameraPermission(true)
                }
            } catch (err) {
                setError('Camera permission denied. Please enable camera access.')
                setCameraPermission(false)
                console.error('Camera error:', err)
            }
        }

        initCamera()

        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
                tracks.forEach(track => track.stop())
            }
            setScanning(false)
        }
    }, [isScannerActive])

    // Handle stopping scanner
    const handleStopScanning = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
            tracks.forEach(track => track.stop())
        }
        setIsScannerActive(false)
        setScanning(false)
        setError(null)
    }

    // Capture and scan QR code
    useEffect(() => {
        if (!scanning || !videoRef.current || !canvasRef.current) return

        const scanInterval = setInterval(async () => {
            const canvas = canvasRef.current
            const video = videoRef.current
            const ctx = canvas?.getContext('2d')

            if (canvas && video && ctx) {
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight
                ctx.drawImage(video, 0, 0)

                // Try to decode QR code using jsQR library
                try {
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                    // Using a simple approach - in production, use a QR code library like jsQR or html5-qrcode
                    // For now, we'll use text input as fallback
                } catch (err) {
                    console.log('QR scan in progress...')
                }
            }
        }, 500)

        return () => clearInterval(scanInterval)
    }, [scanning])

    // Handle manual roll number input
    const handleRollNumberInput = async (rollNumber: string) => {
        if (!rollNumber.trim()) {
            setError('Please enter a valid roll number')
            return
        }

        setLoading(true)
        setError(null)

        try {
            // For now, just show dummy verification
            // Later this will call the backend API
            const dummyResult: QRScanResult = {
                studentName: 'Student Name',
                rollNumber: rollNumber.toUpperCase(),
                outpassId: 'OUT-' + Date.now(),
                exitTime: new Date().toISOString(),
                returnTime: new Date(Date.now() + 4 * 60 * 60000).toISOString(),
                status: 'verified'
            }

            setResult(dummyResult)
            setTimeout(() => {
                setResult(null)
            }, 5000)
        } catch (err: any) {
            setError(err.message || 'Failed to verify roll number')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Start Scanner Button */}
            {!isScannerActive ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                    <Camera className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-blue-900 mb-2">Start QR Scanner</h3>
                    <p className="text-blue-700 mb-4">
                        Click the button below to start scanning QR codes. Your browser will ask for camera permission.
                    </p>
                    <button
                        onClick={() => {
                            setError(null)
                            setIsScannerActive(true)
                        }}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center mx-auto space-x-2"
                    >
                        <Camera className="w-5 h-5" />
                        <span>Open Scanner</span>
                    </button>
                </div>
            ) : null}

            {/* Camera Feed */}
            {isScannerActive && (
                <>
                    {cameraPermission !== false ? (
                        <div className="bg-gray-900 rounded-lg overflow-hidden relative aspect-video">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full"
                            />
                            <canvas ref={canvasRef} style={{ display: 'none' }} />

                            {/* QR Scanning Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-64 h-64 border-4 border-green-500 rounded-lg opacity-50"></div>
                            </div>

                            {/* Status Text */}
                            <div className="absolute bottom-4 left-0 right-0 text-center text-white">
                                <p className="text-sm font-semibold">Point camera at QR code</p>
                            </div>

                            {/* Stop Button */}
                            <button
                                onClick={handleStopScanning}
                                className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors"
                                title="Stop Scanner"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    ) : (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                            <p className="text-red-700">Camera permission denied</p>
                            <p className="text-red-600 text-sm mt-1">Please enable camera access in your browser settings</p>
                            <button
                                onClick={handleStopScanning}
                                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    )}

                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                </>
            )}

            {/* Manual Input - Always Show */}

            {/* Manual Roll Number Input */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Enter Student Roll Number:
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        id="roll-input"
                        placeholder="Enter student roll number (e.g., A001)"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleRollNumberInput((e.target as HTMLInputElement).value)
                                ;(e.target as HTMLInputElement).value = ''
                            }
                        }}
                    />
                    <button
                        onClick={() => {
                            const input = document.getElementById('roll-input') as HTMLInputElement
                            handleRollNumberInput(input.value)
                            input.value = ''
                        }}
                        disabled={loading}
                        className="px-6 py-2 bg-[#1F8941] text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
                    >
                        {loading && <Loader className="w-4 h-4 animate-spin" />}
                        <span>Verify</span>
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-red-700">Error</p>
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                </div>
            )}

            {/* Success Result */}
            {result && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-start space-x-4">
                        <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                            <h3 className="font-bold text-green-800 text-lg mb-3">Student Marked as Exited</h3>
                            <div className="space-y-2 text-green-700 text-sm">
                                <div className="flex justify-between">
                                    <span className="font-semibold">Name:</span>
                                    <span>{result.studentName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold">Roll Number:</span>
                                    <span>{result.rollNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold">Exit Time:</span>
                                    <span>{result.exitTime}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold">Expected Return:</span>
                                    <span>{result.returnTime}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold">Status:</span>
                                    <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs">
                                        {result.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                    <strong>Note:</strong> The system will decode the QR code and automatically update the student's exit status. 
                    Keep the camera steady for better scanning accuracy.
                </p>
            </div>
        </div>
    )
}
