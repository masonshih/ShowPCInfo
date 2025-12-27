import React, { useState, useEffect } from 'react';
import { getAllPrinters, createPrinter, updatePrinter, deletePrinter, deletePrinters, searchPrinters, restorePrinter, restorePrinters, permanentDeletePrinter, permanentDeletePrinters } from '../services/printerService';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportUtils';
import { isValidIP } from '../utils/validators';

function PrinterManagement({ onCountChange }) {
    const [printers, setPrinters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        brand: '',
        model: '',
        asset_id: '',
        ip_address: '',
        toner_replaced_at: '',
        notes: '',
        notes_ii: ''
    });
    const [ipError, setIpError] = useState('');

    // 搜尋與批次刪除狀態
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'single' | 'bulk', ids: [] }
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    // 檢視 modal 狀態
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewPrinter, setViewPrinter] = useState(null);

    // 顯示隱藏項目狀態
    const [showHiddenItems, setShowHiddenItems] = useState(false);

    const notesRef = React.useRef(null);

    // Sync notes_ii content to div only when it differs (avoids cursor jumping)
    useEffect(() => {
        if (notesRef.current && notesRef.current.innerHTML !== formData.notes_ii) {
            notesRef.current.innerHTML = formData.notes_ii || '';
        }
    }, [formData.notes_ii]);

    // 排序狀態
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

    // 分頁狀態
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [copySuccess, setCopySuccess] = useState(null); // { id: number, text: string }

    useEffect(() => {
        fetchPrinters();
    }, []);

    // 搜尋時重置到第 1 頁
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const fetchPrinters = async () => {
        setLoading(true);
        const { data, error } = await (searchQuery ? searchPrinters(searchQuery) : getAllPrinters());
        if (error) {
            setError('無法載入印表機資料: ' + error.message);
        } else {
            setPrinters(data || []);
        }
        setLoading(false);
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        fetchPrinters();
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        // 需要在 setSearchQuery 更新後執行 fetch，這裡直接呼叫 getAllPrinters
        setLoading(true);
        getAllPrinters().then(({ data, error }) => {
            if (error) setError('無法載入印表機資料: ' + error.message);
            else {
                setPrinters(data || []);
            }
            setLoading(false);
        });
    };

    const handleRefresh = () => {
        fetchPrinters();
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (name === 'ip_address') {
            if (value && !isValidIP(value)) {
                setIpError('IP 格式錯誤 (範例: 192.168.1.1)');
            } else {
                setIpError('');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            brand: '',
            model: '',
            asset_id: '',
            ip_address: '',
            toner_replaced_at: '',
            notes: '',
            notes_ii: ''
        });
        setEditingId(null);
        setShowForm(false);
        setIpError('');
    };

    const validateForm = (data, isUpdate = false, currentId = null) => {
        // 1. Check for duplicate IP
        if (data.ip_address) {
            const duplicateIP = printers.find(item =>
                item.ip_address === data.ip_address &&
                (!isUpdate || item.id !== currentId)
            );
            if (duplicateIP) {
                return `IP 地址已存在於系統中 (與 「${duplicateIP.brand} ${duplicateIP.model}」 衝突)`;
            }
        }

        // 2. Check for identical record
        const duplicateRecord = printers.find(item =>
            item.brand === data.brand &&
            item.model === data.model &&
            item.ip_address === data.ip_address &&
            item.asset_id === data.asset_id &&
            (!isUpdate || item.id !== currentId)
        );

        if (duplicateRecord) {
            return '系統中已存在完全相同的詳細資料 (廠牌/型號/IP/財編)';
        }

        return null;
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (formData.ip_address && !isValidIP(formData.ip_address)) {
            setIpError('請修正 IP 地址格式');
            return;
        }

        const validationError = validateForm(formData);
        if (validationError) {
            setError(validationError);
            return;
        }

        // 處理日期欄位，如果是空字串則轉為 null
        const submitData = {
            ...formData,
            toner_replaced_at: formData.toner_replaced_at || null
        };
        const { data, error } = await createPrinter(submitData);
        if (error) {
            setError('新增失敗: ' + error.message);
        } else {
            fetchPrinters();
            resetForm();
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (formData.ip_address && !isValidIP(formData.ip_address)) {
            setIpError('請修正 IP 地址格式');
            return;
        }

        const validationError = validateForm(formData, true, editingId);
        if (validationError) {
            setError(validationError);
            return;
        }

        // 處理日期欄位，如果是空字串則轉為 null
        const submitData = {
            ...formData,
            toner_replaced_at: formData.toner_replaced_at || null
        };
        const { data, error } = await updatePrinter(editingId, submitData);
        if (error) {
            setError('更新失敗: ' + error.message);
        } else {
            fetchPrinters();
            resetForm();
        }
    };

    const handleEdit = (printer) => {
        setEditingId(printer.id);
        setFormData({
            brand: printer.brand || '',
            model: printer.model || '',
            asset_id: printer.asset_id || '',
            ip_address: printer.ip_address || '',
            toner_replaced_at: printer.toner_replaced_at || '',
            notes: printer.notes || '',
            notes_ii: printer.notes_ii || ''
        });
        setShowForm(true);
        setIpError('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleClone = (printer) => {
        setEditingId(null);
        setFormData({
            brand: printer.brand || '',
            model: printer.model || '',
            asset_id: printer.asset_id || '',
            ip_address: printer.ip_address || '',
            toner_replaced_at: printer.toner_replaced_at || '',
            notes: printer.notes || '',
            notes_ii: printer.notes_ii || ''
        });
        setShowForm(true);
        setIpError('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = (item) => {
        setDeleteTarget({ type: 'single', ids: [item.id], mode: 'hide', name: `${item.brand} ${item.model}` });
        setDeleteConfirmText('');
        setShowDeleteModal(true);
    };

    const handlePermanentDelete = (item) => {
        setDeleteTarget({ type: 'single', ids: [item.id], mode: 'delete', name: `${item.brand} ${item.model}` });
        setDeleteConfirmText('');
        setShowDeleteModal(true);
    };

    const handleRestore = (idOrItem) => {
        const id = typeof idOrItem === 'object' ? idOrItem.id : idOrItem;
        const name = typeof idOrItem === 'object' ? `${idOrItem.brand} ${idOrItem.model}` : '';
        setDeleteTarget({ type: 'single', ids: [id], mode: 'restore', name });
        setDeleteConfirmText('');
        setShowDeleteModal(true);
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        const mode = showHiddenItems ? 'restore' : 'hide';
        setDeleteTarget({ type: 'bulk', ids: selectedIds, mode });
        setDeleteConfirmText('');
        setShowDeleteModal(true);
    };

    const executeDelete = async () => {
        if (!deleteTarget) return;

        let error = null;
        if (deleteTarget.mode === 'delete') {
            if (deleteTarget.type === 'single') {
                const result = await permanentDeletePrinter(deleteTarget.ids[0]);
                error = result.error;
            }
        } else if (deleteTarget.mode === 'restore') {
            if (deleteTarget.type === 'single') {
                const result = await restorePrinter(deleteTarget.ids[0]);
                error = result.error;
            } else {
                const result = await restorePrinters(deleteTarget.ids);
                error = result.error;
            }
        } else {
            if (deleteTarget.type === 'single') {
                const result = await deletePrinter(deleteTarget.ids[0]);
                error = result.error;
            } else {
                const result = await deletePrinters(deleteTarget.ids);
                error = result.error;
            }
        }

        if (deleteTarget.mode === 'delete' && deleteTarget.type === 'bulk') {
            const result = await permanentDeletePrinters(deleteTarget.ids);
            error = result.error;
        }

        const modeText = deleteTarget.mode === 'delete' ? '永久刪除' : (deleteTarget.mode === 'restore' ? '還原' : '隱藏');
        if (error) {
            setError(`${modeText}失敗: ` + error.message);
        } else {
            fetchPrinters();
            setSelectedIds([]);
            setShowDeleteModal(false);
        }
    };

    const handleCheckboxChange = (id) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(item => item !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(sortedPrinters.map(p => p.id));
        } else {
            setSelectedIds([]);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('zh-TW');
    };

    // 檢查日期是否為今日
    const isToday = (dateString) => {
        if (!dateString) return false;
        const date = new Date(dateString);
        const today = new Date();
        return date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate();
    };

    // 檢查記錄是否為今日新增或異動
    const isModifiedOrCreatedToday = (item) => {
        return isToday(item.created_at) || isToday(item.updated_at);
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const clipboardData = e.clipboardData || window.clipboardData;
        const items = clipboardData.items;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => {
                    const imgTag = `<img src="${event.target.result}" style="max-width: 100%; height: auto;" />`;
                    document.execCommand('insertHTML', false, imgTag);
                    // Update state manually as contentEditable doesn't trigger onChange
                    setFormData(prev => ({
                        ...prev,
                        notes_ii: document.getElementById('notes-ii-editor').innerHTML
                    }));
                };
                reader.readAsDataURL(blob);
            } else if (items[i].type === 'text/plain') {
                const text = clipboardData.getData('text/plain');
                document.execCommand('insertText', false, text);
                setFormData(prev => ({
                    ...prev,
                    notes_ii: document.getElementById('notes-ii-editor').innerHTML
                }));
            }
        }
    };

    const handleContentChange = (e) => {
        setFormData(prev => ({
            ...prev,
            notes_ii: e.target.innerHTML
        }));
    };

    const handleArchiveTonerDate = () => {
        if (!formData.toner_replaced_at) return;

        const dateStr = formData.toner_replaced_at;
        const archiveText = `[碳粉更換: ${dateStr}]`;

        setFormData(prev => ({
            ...prev,
            notes: prev.notes ? `${prev.notes} ${archiveText}` : archiveText
        }));
    };

    const handleView = (printer) => {
        setViewPrinter(printer);
        setShowViewModal(true);
    };

    const closeView = () => {
        setShowViewModal(false);
        setViewPrinter(null);
    };

    // 複製 IP 功能
    const handleCopyIP = (ip, id) => {
        if (!ip) return;
        navigator.clipboard.writeText(ip).then(() => {
            setCopySuccess({ id, text: '已複製！' });
            setTimeout(() => setCopySuccess(null), 2000);
        }).catch(err => {
            console.error('複製失敗:', err);
            setCopySuccess({ id, text: '複製失敗' });
            setTimeout(() => setCopySuccess(null), 2000);
        });
    };

    // 排序邏輯
    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const sortedPrinters = React.useMemo(() => {
        let sortableItems = [...printers];

        // 過濾隱藏項目
        if (showHiddenItems) {
            // 顯示隱藏模式：只顯示隱藏項目
            sortableItems = sortableItems.filter(item => item.is_hidden);
        } else {
            // 一般模式：只顯示未隱藏項目
            sortableItems = sortableItems.filter(item => !item.is_hidden);
        }

        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // IP 地址特殊排序
                if (sortConfig.key === 'ip_address') {
                    const ipA = aValue ? aValue.split('.').map(Number) : [0, 0, 0, 0];
                    const ipB = bValue ? bValue.split('.').map(Number) : [0, 0, 0, 0];

                    for (let i = 0; i < 4; i++) {
                        if (ipA[i] < ipB[i]) return sortConfig.direction === 'ascending' ? -1 : 1;
                        if (ipA[i] > ipB[i]) return sortConfig.direction === 'ascending' ? 1 : -1;
                    }
                    return 0;
                }

                // 一般字串/日期排序
                if (aValue === null || aValue === undefined) aValue = '';
                if (bValue === null || bValue === undefined) bValue = '';

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [printers, sortConfig, showHiddenItems]);

    // 當過濾後的列表改變時，更新總數
    useEffect(() => {
        if (onCountChange) onCountChange(sortedPrinters.length);
    }, [sortedPrinters, onCountChange]);

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    // 分頁邏輯
    const totalPages = Math.ceil(sortedPrinters.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPrinters = sortedPrinters.slice(startIndex, endIndex);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    };

    if (loading) return <div className="loading"><div className="spinner"></div><p>載入印表機資料中...</p></div>;

    return (
        <div className="printer-management">
            <div className="actions">
                <button
                    className="btn btn-primary"
                    onClick={() => { resetForm(); setShowForm(!showForm); }}
                >
                    {showForm ? '✕ 取消' : '➕ 新增印表機'}
                </button>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="搜尋：廠牌 / 型號 / 財編 / IP / 備註"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                        className="search-input"
                    />
                    <button className="btn btn-secondary" onClick={handleClearSearch}>
                        ✖ 清除
                    </button>
                    <button className="btn btn-secondary" onClick={handleRefresh}>
                        🔄 重新整理
                    </button>
                    <button
                        className={`btn ${showHiddenItems ? 'btn-success' : 'btn-danger'}`}
                        onClick={handleBulkDelete}
                        disabled={selectedIds.length === 0}
                        style={showHiddenItems ? { backgroundColor: '#10b981', borderColor: '#10b981' } : {}}
                    >
                        {showHiddenItems ? `♻️ 還原選取 (${selectedIds.length})` : `🗑️ 隱藏選取 (${selectedIds.length})`}
                    </button>
                    {showHiddenItems && (
                        <button
                            className="btn btn-danger"
                            onClick={() => {
                                if (selectedIds.length === 0) return;
                                setDeleteTarget({ type: 'bulk', ids: selectedIds, mode: 'delete' });
                                setDeleteConfirmText('');
                                setShowDeleteModal(true);
                            }}
                            disabled={selectedIds.length === 0}
                        >
                            🗑️ 永久刪除選取 ({selectedIds.length})
                        </button>
                    )}
                    <div style={{ borderLeft: '1px solid #ccc', paddingLeft: '10px', display: 'flex', gap: '5px' }}>
                        <button className="btn btn-secondary" onClick={() => {
                            const filename = `printers_export_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${new Date().toTimeString().slice(0, 5).replace(/:/g, '')}`;
                            try { exportToCSV(sortedPrinters, filename); } catch (e) { alert('匯出失敗: ' + e.message); }
                        }} title="匯出 CSV">
                            📄 CSV
                        </button>
                        <button className="btn btn-secondary" onClick={() => {
                            const filename = `printers_export_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${new Date().toTimeString().slice(0, 5).replace(/:/g, '')}`;
                            try { exportToExcel(sortedPrinters, filename); } catch (e) { alert('匯出失敗: ' + e.message); }
                        }} title="匯出 Excel">
                            📊 Excel
                        </button>
                        <button className="btn btn-secondary" onClick={() => {
                            const filename = `printers_export_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${new Date().toTimeString().slice(0, 5).replace(/:/g, '')}`;
                            try { exportToPDF(sortedPrinters, filename); } catch (e) { alert('匯出失敗: ' + e.message); }
                        }} title="匯出 PDF">
                            📑 PDF
                        </button>
                        <button
                            className={`btn ${showHiddenItems ? 'btn-warning' : 'btn-secondary'}`}
                            onClick={() => setShowHiddenItems(!showHiddenItems)}
                            title={showHiddenItems ? "切換回一般列表" : "切換至已隱藏列表"}
                        >
                            {showHiddenItems ? '👁️ 顯示正常' : `👁️ 顯示隱藏 (${printers.filter(p => p.is_hidden).length})`}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="modal-overlay" onClick={() => setError(null)}>
                    <div className="modal error-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header modal-header-danger">
                            <h3>⚠️ 錯誤</h3>
                            <button className="modal-close" onClick={() => setError(null)}>✕</button>
                        </div>
                        <div className="modal-content">
                            <p>{error}</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary" onClick={() => setError(null)}>確定</button>
                        </div>
                    </div>
                </div>
            )}

            {showForm && (
                <div className="form-container">
                    <h2>{editingId ? '✏️ 編輯印表機' : '➕ 新增印表機'}</h2>
                    <datalist id="printer-brands">
                        <option value="HP" />
                        <option value="Epson" />
                        <option value="Canon" />
                        <option value="Brother" />
                        <option value="Fuji Xerox" />
                        <option value="Kyocera" />
                        <option value="Ricoh" />
                        <option value="Konica Minolta" />
                        <option value="Lexmark" />
                        <option value="Samsung" />
                    </datalist>
                    <form onSubmit={editingId ? handleUpdate : handleCreate}>
                        <div className="form-grid">
                            <div className="form-section">
                                <h3>基本資訊</h3>
                                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div className="form-group">
                                        <label>廠牌</label>
                                        <input
                                            type="text"
                                            name="brand"
                                            value={formData.brand}
                                            onChange={handleInputChange}
                                            placeholder="例如: HP, Epson"
                                            list="printer-brands"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>型號</label>
                                        <input
                                            type="text"
                                            name="model"
                                            value={formData.model}
                                            onChange={handleInputChange}
                                            placeholder="例如: LaserJet Pro M404dn"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>財編 (選填)</label>
                                        <input
                                            type="text"
                                            name="asset_id"
                                            value={formData.asset_id}
                                            onChange={handleInputChange}
                                            placeholder="例如: A12345678"
                                        />
                                    </div>
                                </div>
                                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div className="form-group">
                                        <label>IP 地址</label>
                                        <input
                                            type="text"
                                            name="ip_address"
                                            value={formData.ip_address}
                                            onChange={handleInputChange}
                                            placeholder="例如: 192.168.1.100"
                                            className={ipError ? 'input-error' : ''}
                                        />
                                        {ipError && <span className="error-text" style={{ color: 'red', fontSize: '0.85rem' }}>{ipError}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>碳粉更換日期 (選填)</label>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <input
                                                type="date"
                                                name="toner_replaced_at"
                                                value={formData.toner_replaced_at}
                                                onChange={handleInputChange}
                                                style={{ flex: 1 }}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={handleArchiveTonerDate}
                                                disabled={!formData.toner_replaced_at}
                                                title="將日期歸檔至備註"
                                                style={{ padding: '8px 12px', fontSize: '0.9rem' }}
                                            >
                                                📥 歸檔
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="form-group highlight-field">
                                    <label>備註</label>
                                    <input
                                        type="text"
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleInputChange}
                                        placeholder="例如: 位於 2F 辦公室"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>備註 II (支援圖片貼上)</label>
                                    <div
                                        id="notes-ii-editor"
                                        ref={notesRef}
                                        contentEditable
                                        onPaste={handlePaste}
                                        onInput={handleContentChange}
                                        style={{
                                            border: '2px solid #e2e8f0',
                                            borderRadius: '8px',
                                            padding: '10px',
                                            minHeight: '100px',
                                            maxHeight: '300px',
                                            overflowY: 'auto',
                                            background: 'white'
                                        }}
                                        suppressContentEditableWarning={true}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={resetForm}>
                                取消
                            </button>
                            <button type="submit" className="btn btn-primary">
                                {editingId ? '💾 更新' : '➕ 新增'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {showViewModal && viewPrinter && (
                <div className="modal-overlay" onClick={closeView}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>檢視 — {viewPrinter.brand} {viewPrinter.model}</h3>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                    className="modal-edit"
                                    onClick={() => {
                                        closeView();
                                        handleEdit(viewPrinter);
                                    }}
                                >
                                    ✏️ 編輯
                                </button>
                                <button className="modal-close" onClick={closeView}>✕</button>
                            </div>
                        </div>
                        <div className="modal-content">
                            {viewPrinter.brand && (
                                <div className="modal-row"><strong>廠牌:</strong> <span>{viewPrinter.brand}</span></div>
                            )}
                            {viewPrinter.model && (
                                <div className="modal-row"><strong>型號:</strong> <span>{viewPrinter.model}</span></div>
                            )}
                            {viewPrinter.asset_id && (
                                <div className="modal-row"><strong>財編:</strong> <span>{viewPrinter.asset_id}</span></div>
                            )}
                            {viewPrinter.ip_address && (
                                <div className="modal-row"><strong>IP 地址:</strong> <span>{viewPrinter.ip_address}</span></div>
                            )}
                            {viewPrinter.toner_replaced_at && (
                                <div className="modal-row"><strong>碳粉更換日期:</strong> <span>{formatDate(viewPrinter.toner_replaced_at)}</span></div>
                            )}
                            {viewPrinter.notes && (
                                <div className="modal-row"><strong>備註:</strong> <span>{viewPrinter.notes}</span></div>
                            )}
                            {viewPrinter.notes_ii && (
                                <div className="modal-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <strong>備註 II:</strong>
                                    <div
                                        style={{ marginTop: '10px', width: '100%', overflowX: 'auto' }}
                                        dangerouslySetInnerHTML={{ __html: viewPrinter.notes_ii }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showDeleteModal && deleteTarget && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header modal-header-danger">
                            <h3>⚠️ 確認{deleteTarget.mode === 'delete' ? '永久刪除' : (deleteTarget.mode === 'restore' ? '還原' : '隱藏')}{deleteTarget.name ? ` — ${deleteTarget.name}` : ''}</h3>
                            <button className="modal-close" onClick={() => setShowDeleteModal(false)}>✕</button>
                        </div>
                        <div className="modal-content">
                            <div className="delete-warning">
                                {deleteTarget.mode === 'restore' ? (
                                    <p>您即將<strong>還原 {deleteTarget.ids.length}</strong> 筆印表機資訊記錄。</p>
                                ) : (
                                    deleteTarget.mode === 'delete' ? (
                                        <p>您即將<strong>永久刪除</strong>這筆隱藏的記錄。此操作<strong>無法復原</strong>。</p>
                                    ) : (
                                        deleteTarget.type === 'single' ? (
                                            <p>您即將<strong>隱藏</strong>這筆印表機資訊記錄。</p>
                                        ) : (
                                            <p>您即將<strong>隱藏 {deleteTarget.ids.length}</strong> 筆印表機資訊記錄。</p>
                                        )
                                    )
                                )}
                            </div>
                            <div className="delete-confirm-input">
                                <label>
                                    請輸入 <code className="delete-code">{deleteTarget.mode === 'delete' ? 'DELETE' : (deleteTarget.mode === 'restore' ? 'RESTORE' : 'HIDE')}</code> 以確認{deleteTarget.mode === 'delete' ? '刪除' : (deleteTarget.mode === 'restore' ? '還原' : '隱藏')}：
                                </label>
                                <input
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    placeholder={`輸入 ${deleteTarget.mode === 'delete' ? 'DELETE' : (deleteTarget.mode === 'restore' ? 'RESTORE' : 'HIDE')}`}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                取消
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={executeDelete}
                                disabled={deleteConfirmText !== (deleteTarget.mode === 'delete' ? 'DELETE' : (deleteTarget.mode === 'restore' ? 'RESTORE' : 'HIDE'))}
                            >
                                確認{deleteTarget.mode === 'delete' ? '刪除' : (deleteTarget.mode === 'restore' ? '還原' : '隱藏')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="table-container">
                <table className="pc-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>
                                <input
                                    type="checkbox"
                                    onChange={handleSelectAll}
                                    checked={sortedPrinters.length > 0 && selectedIds.length === sortedPrinters.length && sortedPrinters.every(p => selectedIds.includes(p.id))}
                                />
                            </th>
                            <th onClick={() => requestSort('brand')} style={{ cursor: 'pointer' }}>廠牌{getSortIndicator('brand')}</th>
                            <th onClick={() => requestSort('model')} style={{ cursor: 'pointer' }}>型號{getSortIndicator('model')}</th>
                            <th onClick={() => requestSort('asset_id')} style={{ cursor: 'pointer' }}>財編{getSortIndicator('asset_id')}</th>
                            <th onClick={() => requestSort('ip_address')} style={{ cursor: 'pointer' }}>IP 地址{getSortIndicator('ip_address')}</th>
                            <th onClick={() => requestSort('toner_replaced_at')} style={{ cursor: 'pointer' }}>碳粉更換日期{getSortIndicator('toner_replaced_at')}</th>
                            {showHiddenItems && (
                                <>
                                    <th onClick={() => requestSort('is_hidden')} style={{ cursor: 'pointer' }}>隱藏{getSortIndicator('is_hidden')}</th>
                                    <th onClick={() => requestSort('hidden_at')} style={{ cursor: 'pointer' }}>隱藏日期{getSortIndicator('hidden_at')}</th>
                                </>
                            )}
                            <th>備註</th>
                            <th>動作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentPrinters.length === 0 ? (
                            <tr>
                                <td colSpan={showHiddenItems ? "9" : "7"} className="no-data">目前沒有印表機資料</td>
                            </tr>
                        ) : (
                            currentPrinters.map(printer => {
                                const classNames = [];
                                if (selectedIds.includes(printer.id)) classNames.push('selected-row');
                                if (isModifiedOrCreatedToday(printer)) classNames.push('row-today-modified');
                                if (printer.notes && printer.notes.trim() !== '') classNames.push('row-with-notes');

                                return (
                                    <tr key={printer.id} className={classNames.join(' ')}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(printer.id)}
                                                onChange={() => handleCheckboxChange(printer.id)}
                                            />
                                        </td>
                                        <td>{printer.brand}</td>
                                        <td>{printer.model}</td>
                                        <td>{printer.asset_id || '-'}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <span>{printer.ip_address || '-'}</span>
                                                {printer.ip_address && (
                                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                                        <button
                                                            className="btn-icon"
                                                            onClick={(e) => { e.stopPropagation(); handleCopyIP(printer.ip_address, printer.id); }}
                                                            title="複製 IP"
                                                            style={{ padding: '2px 5px', fontSize: '0.9rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
                                                        >
                                                            📋
                                                        </button>
                                                        <button
                                                            className="btn-icon"
                                                            onClick={(e) => { e.stopPropagation(); window.open(`http://${printer.ip_address}`, '_blank'); }}
                                                            title="開啟網頁"
                                                            style={{ padding: '2px 5px', fontSize: '0.9rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
                                                        >
                                                            🌐
                                                        </button>
                                                        {copySuccess && copySuccess.id === printer.id && (
                                                            <span style={{
                                                                position: 'absolute',
                                                                top: '-25px',
                                                                left: '50%',
                                                                transform: 'translateX(-50%)',
                                                                background: '#333',
                                                                color: 'white',
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                fontSize: '12px',
                                                                whiteSpace: 'nowrap',
                                                                zIndex: 10
                                                            }}>
                                                                {copySuccess.text}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>{formatDate(printer.toner_replaced_at)}</td>
                                        {showHiddenItems && (
                                            <>
                                                <td>
                                                    <span style={{
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        backgroundColor: printer.is_hidden ? '#fee2e2' : '#dcfce7',
                                                        color: printer.is_hidden ? '#991b1b' : '#166534',
                                                        fontSize: '0.85em'
                                                    }}>
                                                        {printer.is_hidden ? '是' : '否'}
                                                    </span>
                                                </td>
                                                <td>{printer.hidden_at ? new Date(printer.hidden_at).toLocaleString('zh-TW') : '-'}</td>
                                            </>
                                        )}
                                        <td>{printer.notes || '-'}</td>
                                        <td className="actions-cell">
                                            <button
                                                className="btn-icon view"
                                                onClick={() => handleView(printer)}
                                                title="檢視"
                                            >
                                                🔍
                                            </button>
                                            <button
                                                className="btn-icon edit"
                                                onClick={() => handleEdit(printer)}
                                                title="編輯"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="btn-icon clone"
                                                onClick={() => handleClone(printer)}
                                                title="複製新增"
                                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem' }}
                                            >
                                                📄
                                            </button>
                                            {printer.is_hidden ? (
                                                <>
                                                    <button
                                                        className="btn-icon restore"
                                                        onClick={() => handleRestore(printer)}
                                                        title="還原"
                                                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem' }}
                                                    >
                                                        ♻️
                                                    </button>
                                                    <button
                                                        className="btn-icon delete"
                                                        onClick={() => handlePermanentDelete(printer)}
                                                        title="永久刪除"
                                                    >
                                                        🗑️
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    className="btn-icon delete"
                                                    onClick={() => handleDelete(printer)}
                                                    title="隱藏"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>

                {sortedPrinters.length > 0 && (
                    <div className="pagination-container">
                        <div className="pagination-info">
                            顯示 {startIndex + 1}-{Math.min(endIndex, sortedPrinters.length)} / 共 {sortedPrinters.length} 筆
                        </div>
                        <div className="pagination">
                            <button
                                className="pagination-button"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                上一頁
                            </button>
                            {getPageNumbers().map(page => (
                                <button
                                    key={page}
                                    className={`pagination-button ${currentPage === page ? 'active' : ''}`}
                                    onClick={() => handlePageChange(page)}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                className="pagination-button"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                下一頁
                            </button>
                        </div>
                        <div className="items-per-page">
                            <label>每頁顯示：</label>
                            <select value={itemsPerPage} onChange={handleItemsPerPageChange}>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PrinterManagement;
