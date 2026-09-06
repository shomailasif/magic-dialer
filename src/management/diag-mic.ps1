# Diagnose: does the default capture device deliver ANY audio?
# Records 3 seconds of mic audio and reports RMS/peak. No COM, plain winmm.
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

[StructLayout(LayoutKind.Sequential)]
public struct WAVEFORMATEX {
    public ushort wFormatTag; public ushort nChannels;
    public uint nSamplesPerSec; public uint nAvgBytesPerSec;
    public ushort nBlockAlign; public ushort wBitsPerSample; public ushort cbSize;
}

[StructLayout(LayoutKind.Sequential)]
public struct WAVEHDR {
    public IntPtr lpData; public uint dwBufferLength; public uint dwBytesRecorded;
    public IntPtr lpNext; public IntPtr dwFlags; public IntPtr dwLoops;
    public IntPtr lpReserved; public UIntPtr dwUser; public UIntPtr dwReserved1; public UIntPtr dwReserved2;
}

public static class MicProbe {
    [DllImport("winmm.dll")] static extern uint waveInGetNumDevs();
    [DllImport("winmm.dll")] static extern uint waveInOpen(out IntPtr hwi, uint uDeviceID, ref WAVEFORMATEX pwfx, IntPtr dwCallback, IntPtr dwInstance, uint fdwOpen);
    [DllImport("winmm.dll")] static extern uint waveInPrepareHeader(IntPtr hwi, ref WAVEHDR pwh, uint cbwh);
    [DllImport("winmm.dll")] static extern uint waveInAddBuffer(IntPtr hwi, ref WAVEHDR pwh, uint cbwh);
    [DllImport("winmm.dll")] static extern uint waveInStart(IntPtr hwi);
    [DllImport("winmm.dll")] static extern uint waveInStop(IntPtr hwi);
    [DllImport("winmm.dll")] static extern uint waveInClose(IntPtr hwi);

    public static void Run() {
        Console.WriteLine("num capture devices: " + waveInGetNumDevs());
        WAVEFORMATEX fmt = new WAVEFORMATEX();
        fmt.wFormatTag = 1; fmt.nChannels = 1; fmt.nSamplesPerSec = 8000;
        fmt.wBitsPerSample = 16; fmt.nBlockAlign = 2; fmt.nAvgBytesPerSec = 16000;
        uint n = 40000; // 3 seconds
        IntPtr hwi;
        uint r = waveInOpen(out hwi, 0, ref fmt, IntPtr.Zero, IntPtr.Zero, 0);
        if (r != 0) { Console.WriteLine("open default capture FAILED: " + r); return; }
        IntPtr buf = Marshal.AllocHGlobal((int)n);
        WAVEHDR hdr = new WAVEHDR();
        hdr.lpData = buf; hdr.dwBufferLength = n;
        waveInPrepareHeader(hwi, ref hdr, (uint)Marshal.SizeOf(hdr));
        waveInAddBuffer(hwi, ref hdr, (uint)Marshal.SizeOf(hdr));
        waveInStart(hwi);
        System.Threading.Thread.Sleep(5200);
        waveInStop(hwi);
        short[] samples = new short[n / 2];
        Marshal.Copy(buf, samples, 0, (int)(n / 2));
        double sum = 0; int peak = 0;
        foreach (short s in samples) {
            long v = s; sum += v * v;
            int a = Math.Abs((int)s); if (a > peak) peak = a;
        }
        double rms = Math.Sqrt(sum / samples.Length);
        Console.WriteLine("RMS=" + rms.ToString("F1") + " peak=" + peak);
        Console.WriteLine(rms > 40 ? "-> MIC DELIVERS AUDIO (RMS high)" : "-> MIC IS SILENT (RMS near zero)");
        waveInClose(hwi);
        Marshal.FreeHGlobal(buf);
    }
}
"@

[MicProbe]::Run()
