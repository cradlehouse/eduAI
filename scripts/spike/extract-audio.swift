// swift extract-audio.swift in.mp4 out.m4a — pulls the sound track out of a clip (macOS, no ffmpeg needed).
import AVFoundation
let a = AVURLAsset(url: URL(fileURLWithPath: CommandLine.arguments[1]))
let ex = AVAssetExportSession(asset: a, presetName: AVAssetExportPresetAppleM4A)!
let out = URL(fileURLWithPath: CommandLine.arguments[2]); try? FileManager.default.removeItem(at: out)
ex.outputURL = out; ex.outputFileType = .m4a
let s = DispatchSemaphore(value: 0); ex.exportAsynchronously { s.signal() }; s.wait()
if ex.status != .completed { print("export failed", ex.error as Any); exit(1) }
