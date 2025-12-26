/**
 * 驗證 IP 地址格式 (IPv4)
 * @param {string} ip - 要驗證的 IP 地址字串
 * @returns {boolean} - 是否為有效的 IPv4 地址
 */
export const isValidIP = (ip) => {
    // 允許空值 (因為某些欄位可能是選填，若必填則由 UI 控制 required)
    if (!ip) return true;

    // IPv4 Regex: 檢查四個 0-255 的數字，中間用 . 分隔
    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    return ipv4Regex.test(ip);
};
