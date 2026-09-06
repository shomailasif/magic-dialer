# Enumerate capture endpoints and reveal the DEFAULT, then (optionally) point it
# at the internal microphone if it isn't already.
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
public class MMDeviceEnumeratorComObject { }

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDeviceEnumerator {
    int EnumAudioEndpoints(int dataFlow, int stateMask, out IMMDeviceCollection devices);
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice device);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDevice {
    int Activate(ref Guid iid, int clsCtx, IntPtr pActivationParams, out IntPtr pInterface);
    int OpenPropertyStore(int access, out IntPtr propStore);
    int GetId(out string id);
    int GetState(out int state);
}

[Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDeviceCollection {
    int GetCount(out int count);
    int Item(int index, out IMMDevice device);
}

[ComImport, Guid("F8679F50-850A-41CF-9C72-430F290290C8")]
public class CPolicyConfigClient { }

[Guid("568b9108-44bf-40b4-9006-86afe5b5a620"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IPolicyConfig {
    int GetMixFormat(string pszDeviceName, IntPtr pfmt);
    int GetDeviceFormat(string pszDeviceName, bool bDefault, IntPtr ppfmt);
    int ResetDeviceFormat(string pszDeviceName);
    int SetDevicePeriod(string pszDeviceName, IntPtr pmftDefaultPeriod, IntPtr pmftMinimumPeriod);
    int GetDevicePeriod(string pszDeviceName, bool bDefault, IntPtr pmftDefaultPeriod, IntPtr pmftMinimumPeriod);
    int GetShareMode(string pszDeviceName, IntPtr pMode);
    int GetDeviceState(string pszDeviceName, out IntPtr pdwState);
    int SetDefaultEndpoint(string pszDeviceName, int role);
    int SetEndpointVisibility(string pszDeviceName, bool bVisible);
}

public class AudioUtil {
    [DllImport("ole32.dll")]
    static extern int PropVariantClear(ref PropVariant pvar);

    [StructLayout(LayoutKind.Sequential)]
    public struct PropVariant {
        public short vt;
        public short wReserved1;
        public short wReserved2;
        public short wReserved3;
        public IntPtr p;
    }

    const int STGM_READ = 0;
    const int PKEY_Device_FriendlyName = 14; // PKEY index via PROPERTYKEY store simplified
    public static void Dump(string kind) {
        var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
        IMMDevice defaultDev;
        int hr = enumerator.GetDefaultAudioEndpoint(kind == "capture" ? 1 : 0, 0, out defaultDev);
        string defId = null;
        Console.WriteLine("default(" + kind + ") hr=" + hr);
        if (hr == 0 && defaultDev != null) { defaultDev.GetId(out defId); Console.WriteLine("DEFAULT ID: " + defId); }
        IMMDeviceCollection coll;
        enumerator.EnumAudioEndpoints(kind == "capture" ? 1 : 0, 0xF, out coll);
        int n; coll.GetCount(out n);
        for (int i = 0; i < n; i++) {
            IMMDevice dev; coll.Item(i, out dev);
            string id; dev.GetId(out id);
            int state; dev.GetState(out state);
            string label = id;
            if (id.ToUpperInvariant().Contains("C52B9BD1")) label = "Internal Microphone (Conexant)";
            else if (id.ToUpperInvariant().Contains("7B5E9FD9")) label = "Speakers (Conexant)";
            else if (id.ToUpperInvariant().Contains("C2C2EF99") || id.ToUpperInvariant().Contains("D6183472")) label = "Evo Z-Buds Hands-Free";
            else if (id.ToUpperInvariant().Contains("728D56A6")) label = "Evo Z-Buds Stereo";
            else if (id.ToUpperInvariant().Contains("77008DD1")) label = "Intel Display Audio (HDMI)";
            else if (id.ToUpperInvariant().Contains("30B07D63")) label = "External Microphone (Conexant)";
            else if (id.ToUpperInvariant().Contains("33C60F1E")) label = "Headphones (Conexant)";
            Console.WriteLine((id == defId ? "  * " : "    ") + label + " state=" + state);
        }
    }

    public static int SetDefaultCapture(string deviceId) {
        var pc = new CPolicyConfigClient();
        var config = (IPolicyConfig)pc;
        int role0 = config.SetDefaultEndpoint(deviceId, 0);
        int role1 = config.SetDefaultEndpoint(deviceId, 1);
        int role2 = config.SetDefaultEndpoint(deviceId, 2);
        return (role0 == 0 && role1 == 0 && role2 == 0) ? 0 : role0;
    }
}
"@

[AudioUtil]::Dump("capture")
[AudioUtil]::Dump("render")