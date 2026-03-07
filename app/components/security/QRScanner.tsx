'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { AlertCircle, CheckCircle, Loader, Camera, X, Search as SearchIcon } from 'lucide-react'
import jsQR from 'jsqr'

interface QRScanResult {
    studentName: string
    rollNumber: string
    outpassId: string
    exitTime: string
    returnTime: string
    status: string
}

interface SearchResult {
    outpassId: string
    studentName: string
    rollNumber: string
    reasonCategory: string
    exitTime: string
    returnTime: string
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') as string) || "http://localhost:5000"

export default function QRScanner() {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isScannerActive, setIsScannerActive] = useState(false)
    const [scanning, setScanning] = useState(false)
    const [result, setResult] = useState<QRScanResult | null>(null)
    const [searchResult, setSearchResult] = useState<SearchResult | null>(null) // For manual lookup
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [cameraPermission, setCameraPermission] = useState<boolean | null>(null)

    const getToken = () => typeof window !== "undefined" ? window.localStorage.getItem("token") : null;

    // --- 1. CAMERA INITIALIZATION ---
    useEffect(() => {
        if (!isScannerActive) return

        const initCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        facingMode: 'environment',
                        width: { ideal: 1920 }, // Requests high-definition width
                        height: { ideal: 1080 } // Requests high-definition height
                    }
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

    const handleStopScanning = useCallback(() => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
            tracks.forEach(track => track.stop())
        }
        setIsScannerActive(false)
        setScanning(false)
    }, [])

    // --- 2. API: SCAN QR & MARK EXITED ---
    const handleQRScanned = useCallback(async (qrToken: string) => {
        handleStopScanning() // Stop camera once scanned
        setLoading(true)
        setError(null)
        setResult(null)
        setSearchResult(null)

        try {
            const response = await fetch(`${API_BASE}/api/security/scan-qr`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`
                },
                body: JSON.stringify({ qrToken })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || "Failed to verify QR Code")
            }

            setResult(data.data) // Show success UI
        } catch (err: any) {
            setError(err.message || 'Error processing QR Code')
        } finally {
            setLoading(false)
        }
    }, [handleStopScanning])

    // --- 3. QR DECODING LOOP ---
    useEffect(() => {
        if (!scanning || !videoRef.current || !canvasRef.current) return

        const scanInterval = setInterval(() => {
            const canvas = canvasRef.current
            const video = videoRef.current
            const ctx = canvas?.getContext('2d', { willReadFrequently: true })

            // Ensure video has loaded enough data to draw
            if (canvas && video && ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                
                // Use jsQR to decode the frame
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert",
                })

                if (code && code.data) {
                    clearInterval(scanInterval) // Stop the loop
                    handleQRScanned(code.data)  // Fire API
                }
            }
        }, 300) // Scan 3 times a second

        return () => clearInterval(scanInterval)
    }, [scanning, handleQRScanned])

    // --- 4. API: MANUAL SEARCH ---
    const handleRollNumberSearch = async (query: string) => {
        if (!query.trim()) {
            setError('Please enter a valid roll number or ID')
            return
        }

        setLoading(true)
        setError(null)
        setResult(null)
        setSearchResult(null)

        try {
            const response = await fetch(`${API_BASE}/api/security/search-outpass?query=${encodeURIComponent(query)}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`
                }
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || "Search failed")
            }

            setSearchResult(data.data) // Show confirmation UI
        } catch (err: any) {
            setError(err.message || 'Failed to search for student')
        } finally {
            setLoading(false)
        }
    }

    // --- 5. API: MANUAL MARK EXITED ---
    const handleManualMarkExited = async (outpassId: string) => {
        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`${API_BASE}/api/security/mark-exited/${outpassId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`
                }
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || "Failed to mark as exited")
            }

            // Move from Search UI to Success UI
            setSearchResult(null) 
            setResult({
                ...data.data,
                exitTime: new Date().toLocaleTimeString(),
                returnTime: 'Pending'
            })
        } catch (err: any) {
            setError(err.message || 'Failed to mark as exited')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Start Scanner Button */}
            {!isScannerActive && !loading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                    <Camera className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-blue-900 mb-2">Start Live QR Scanner</h3>
                    <p className="text-blue-700 mb-4 text-sm">
                        Scan the time-sensitive QR code from the student's mobile device.
                    </p>
                    <button
                        onClick={() => {
                            setError(null)
                            setResult(null)
                            setSearchResult(null)
                            setIsScannerActive(true)
                        }}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center mx-auto space-x-2 shadow-sm"
                    >
                        <Camera className="w-5 h-5" />
                        <span>Open Scanner</span>
                    </button>
                </div>
            )}

            {/* Camera Feed */}
            {isScannerActive && (
                <>
                    {cameraPermission !== false ? (
                        <div className="bg-gray-900 rounded-lg overflow-hidden relative aspect-[4/3] md:aspect-video shadow-inner">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />
                            <canvas ref={canvasRef} className="hidden" />

                            {/* QR Scanning Target Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-48 h-48 sm:w-64 sm:h-64 border-4 border-green-400 rounded-2xl opacity-80 animate-pulse"></div>
                            </div>

                            <div className="absolute bottom-6 left-0 right-0 text-center">
                                <span className="bg-black/60 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
                                    Scanning for QR...
                                </span>
                            </div>

                            <button
                                onClick={handleStopScanning}
                                className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-full transition-colors shadow-lg"
                                title="Stop Scanner"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                            <p className="text-red-700 font-bold">Camera permission denied</p>
                            <p className="text-red-600 text-sm mt-1">Please enable camera access in your browser URL bar settings.</p>
                            <button
                                onClick={handleStopScanning}
                                className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                Close Scanner
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Manual Roll Number Search */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <label className="block text-sm font-bold text-gray-800 mb-3">
                    Manual Verification (Roll No / Outpass ID)
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            id="roll-input"
                            placeholder="Enter Roll No (e.g. 21CS1001)"
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F8941] uppercase"
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    const input = e.target as HTMLInputElement
                                    handleRollNumberSearch(input.value)
                                }
                            }}
                            disabled={loading || isScannerActive}
                        />
                    </div>
                    <button
                        onClick={() => {
                            const input = document.getElementById('roll-input') as HTMLInputElement
                            handleRollNumberSearch(input.value)
                        }}
                        disabled={loading || isScannerActive}
                        className="px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition-colors flex items-center justify-center space-x-2 font-medium"
                    >
                        {loading ? <Loader className="w-5 h-5 animate-spin" /> : <span>Search</span>}
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-red-800">Scan Failed</p>
                        <p className="text-red-700 text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Manual Search Result (Awaiting Confirmation) */}
            {searchResult && (
                <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-6">
                    <div className="flex items-start space-x-4">
                        <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                            <h3 className="font-bold text-yellow-800 text-lg mb-1">Approved Outpass Found</h3>
                            <p className="text-sm text-yellow-700 mb-4">Please verify the student visually before marking as exited.</p>
                            
                            <div className="bg-white rounded-lg p-4 border border-yellow-200 space-y-2 mb-4">
                                <p className="text-sm"><span className="text-gray-500 font-medium w-24 inline-block">Name:</span> <span className="font-bold text-gray-900">{searchResult.studentName}</span></p>
                                <p className="text-sm"><span className="text-gray-500 font-medium w-24 inline-block">Roll No:</span> <span className="font-bold text-gray-900">{searchResult.rollNumber}</span></p>
                                <p className="text-sm"><span className="text-gray-500 font-medium w-24 inline-block">Reason:</span> <span className="text-gray-900">{searchResult.reasonCategory}</span></p>
                                <div className="border-t border-gray-100 pt-2 mt-2">
                                    <p className="text-sm"><span className="text-gray-500 font-medium w-24 inline-block">Exit Time:</span> <span className="font-medium text-gray-900">{searchResult.exitTime}</span></p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleManualMarkExited(searchResult.outpassId)}
                                    disabled={loading}
                                    className="flex-1 bg-[#1F8941] text-white px-4 py-2.5 rounded-lg hover:bg-[#1a7a39] font-medium flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    Confirm Exit
                                </button>
                                <button
                                    onClick={() => setSearchResult(null)}
                                    disabled={loading}
                                    className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Final Success Result */}
            {result && (
                <div className="bg-green-50 border border-green-400 rounded-xl p-6 shadow-sm animate-in zoom-in-95 duration-300">
                    <div className="flex items-start space-x-4">
                        <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                            <h3 className="font-black text-green-800 text-xl mb-1">EXIT APPROVED</h3>
                            <p className="text-green-700 text-sm mb-4 font-medium">Student has been officially marked as exited.</p>
                            
                            <div className="bg-white rounded-lg p-4 border border-green-200 space-y-3">
                                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                    <span className="text-gray-500 font-medium text-sm">Student</span>
                                    <span className="font-bold text-gray-900">{result.studentName} ({result.rollNumber})</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                    <span className="text-gray-500 font-medium text-sm">Status</span>
                                    <span className="bg-green-600 text-white px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
                                        {result.status}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pt-1">
                                    <span className="text-gray-500 font-medium text-sm">Outpass ID</span>
                                    <span className="text-gray-900 text-sm font-mono">{result.outpassId.slice(-6).toUpperCase()}</span>
                                </div>
                            </div>

                            <button 
                                onClick={() => setResult(null)}
                                className="mt-5 w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 font-medium transition-colors"
                            >
                                Scan Next Student
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}