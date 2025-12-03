const os = require("os");

if (typeof os.networkInterfaces === "function") {
  const original = os.networkInterfaces;

  os.networkInterfaces = () => {
    try {
      const result = original();
      if (result && Object.keys(result).length > 0) {
        return result;
      }
    } catch {
      // ignore errors and fallback below
    }

    return {
      loopback: [
        { address: "127.0.0.1", family: "IPv4" },
        { address: "::1", family: "IPv6", scopeid: 0 },
      ],
    };
  };
}


