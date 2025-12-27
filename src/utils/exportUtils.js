import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';



// 定義電腦資訊匯出欄位對應


const formatPrinterData = (data) => {
    return data.map(item => ({
        '廠牌': item.brand,
        '型號': item.model,
        '財編': item.asset_id || '-',
        'IP 地址': item.ip_address || '-',
        '碳粉更換日期': item.toner_replaced_at ? new Date(item.toner_replaced_at).toLocaleDateString('zh-TW') : '-',
        '備註': item.notes || '-',
        '備註 II': item.notes_ii ? item.notes_ii.replace(/<[^>]+>/g, '') : '-',
        '異動日期': item.updated_at ? new Date(item.updated_at).toLocaleString('zh-TW', { hour12: false }) : '-'
    }));
};

const formatNetworkData = (data) => {
    return data.map(item => ({
        '廠牌': item.brand,
        '型號': item.model,
        '財編': item.asset_id || '-',
        'IP 地址': item.ip_address || '-',
        '位置': item.location || '-',
        '購買日期': item.purchase_date ? new Date(item.purchase_date).toLocaleDateString('zh-TW') : '-',
        '備註': item.notes || '-',
        '備註 II': item.notes_ii ? item.notes_ii.replace(/<[^>]+>/g, '') : '-',
        '異動日期': item.updated_at ? new Date(item.updated_at).toLocaleString('zh-TW', { hour12: false }) : '-'
    }));
};

const formatPCData = (data) => {
    return data.map(item => ({
        '電腦名稱': item.computer_name || '-',
        'CPU': item.cpu_name ? `${item.cpu_name}${item.cores ? ` (${item.cores}核/${item.logical_processors}緒)` : ''}` : '-',
        '記憶體': item.ram_gb ? `${item.ram_gb} GB` : '-',
        '硬碟資訊': item.hdd_info || '-',
        '作業系統': item.os_name ? `${item.os_name}${item.os_version ? ` ${item.os_version}` : ''}` : '-',
        'IP 地址': item.ip_address || '-',
        '異動日期': item.updated_at ? new Date(item.updated_at).toLocaleString('zh-TW', { hour12: false }) : '-'
    }));
};


/**
 * 匯出印表機為 CSV
 */
export const exportToCSV = (data, filename = 'printers_export') => {
    const formattedData = formatPrinterData(data);
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Printers');
    XLSX.writeFile(workbook, `${filename}.csv`);
};

/**
 * 匯出印表機為 Excel
 */
export const exportToExcel = (data, filename = 'printers_export') => {
    const formattedData = formatPrinterData(data);
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Printers');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * 匯出網路設備為 CSV
 */
export const exportNetworkToCSV = (data, filename = 'network_export') => {
    const formattedData = formatNetworkData(data);
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Network Equipment');
    XLSX.writeFile(workbook, `${filename}.csv`);
};

/**
 * 匯出網路設備為 Excel
 */
export const exportNetworkToExcel = (data, filename = 'network_export') => {
    const formattedData = formatNetworkData(data);
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Network Equipment');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * 匯出電腦資訊為 CSV
 */
export const exportPCToCSV = (data, filename = 'pc_info_export') => {
    const formattedData = formatPCData(data);
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PC Info');
    XLSX.writeFile(workbook, `${filename}.csv`);
};

/**
 * 匯出電腦資訊為 Excel
 */
export const exportPCToExcel = (data, filename = 'pc_info_export') => {
    const formattedData = formatPCData(data);
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PC Info');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * 通用 PDF 生成函數
 */
const generatePDF = async (headers, rows, title, filename) => {
    const doc = new jsPDF({ orientation: 'landscape' });

    let loadedFontName = null;
    const fonts = [
        { name: 'NotoSansTC', url: 'https://fonts.gstatic.com/s/notosanstc/v35/-nFuOG829Oofr2wohFbTp9ifNAn722rq0MXz76Cy_CpOtma3uNQ.ttf' },
        { name: 'NotoSansSC', url: 'https://fonts.gstatic.com/s/notosanssc/v36/k3kCo84MPvpLmixcA63oeALhL4iJ-Q7m8w.ttf' }
    ];

    for (const font of fonts) {
        try {
            const response = await fetch(font.url);
            const contentType = response.headers.get('content-type');

            if (response.ok && contentType && !contentType.includes('text/html')) {
                const blob = await response.blob();
                if (blob.size > 1000) {
                    const reader = new FileReader();
                    const fontNameResult = await new Promise((resolve, reject) => {
                        reader.onloadend = () => {
                            try {
                                const base64data = reader.result.split(',')[1];
                                doc.addFileToVFS(font.name + '.ttf', base64data);
                                doc.addFont(font.name + '.ttf', font.name, 'normal');
                                doc.setFont(font.name);
                                resolve(font.name);
                            } catch (e) { reject(e); }
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                    if (fontNameResult) {
                        loadedFontName = fontNameResult;
                    }
                    if (loadedFontName) break;
                }
            }
        } catch (e) {
            console.warn(`嘗試載入字型 ${font.url} 失敗:`, e);
        }
    }

    if (!loadedFontName) {
        console.warn('無法載入任何中文字型，將使用預設字型');
    }

    doc.text(title, 14, 15);

    autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 20,
        styles: {
            fontSize: 10,
            font: loadedFontName || 'helvetica',
            fontStyle: 'normal'
        },
    });

    doc.save(`${filename}.pdf`);
};

/**
 * 匯出印表機為 PDF
 */
export const exportToPDF = async (data, filename = 'printers_export') => {
    const headers = ["Brand", "Model", "Asset ID", "IP Address", "Toner Date", "Notes", "Notes II", "異動日期"];
    const rows = data.map(item => [
        item.brand,
        item.model,
        item.asset_id || '-',
        item.ip_address || '-',
        item.toner_replaced_at ? new Date(item.toner_replaced_at).toLocaleDateString('zh-TW') : '-',
        item.notes || '-',
        item.notes_ii ? '[Rich Content]' : '-',
        item.updated_at ? new Date(item.updated_at).toLocaleString('zh-TW', { hour12: false }) : '-'
    ]);

    await generatePDF(headers, rows, 'Printer Information Export', filename);
};

/**
 * 匯出網路設備為 PDF
 */
export const exportNetworkToPDF = async (data, filename = 'network_export') => {
    const headers = ["Brand", "Model", "Asset ID", "IP Address", "Location", "Purchase Date", "Notes", "Notes II", "異動日期"];
    const rows = data.map(item => [
        item.brand,
        item.model,
        item.asset_id || '-',
        item.ip_address || '-',
        item.location || '-',
        item.purchase_date ? new Date(item.purchase_date).toLocaleDateString('zh-TW') : '-',
        item.notes || '-',
        item.notes_ii ? '[Rich Content]' : '-',
        item.updated_at ? new Date(item.updated_at).toLocaleString('zh-TW', { hour12: false }) : '-'
    ]);

    await generatePDF(headers, rows, 'Network Equipment Export', filename);
};

/**
 * 匯出電腦資訊為 PDF
 */
export const exportPCToPDF = async (data, filename = 'pc_info_export') => {
    const headers = [
        "電腦名稱", "CPU", "記憶體", "硬碟資訊", "作業系統", "IP 地址", "異動日期"
    ];
    const rows = data.map(item => [
        item.computer_name || '-',
        item.cpu_name ? `${item.cpu_name}\n${item.cores ? `(${item.cores}核/${item.logical_processors}緒)` : ''}` : '-',
        item.ram_gb ? `${item.ram_gb} GB` : '-',
        item.hdd_info || '-',
        item.os_name ? `${item.os_name}\n${item.os_version || ''}` : '-',
        item.ip_address || '-',
        item.updated_at ? new Date(item.updated_at).toLocaleString('zh-TW', { hour12: false }) : '-'
    ]);

    await generatePDF(headers, rows, 'PC Information Export', filename);
};
