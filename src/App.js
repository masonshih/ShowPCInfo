import React, { useState, useEffect } from 'react';
import './App.css';
import { getAllPCInfo, createPCInfo, updatePCInfo, deletePCInfo, deletePCInfos, searchPCInfo, restorePCInfo, restorePCInfos, permanentDeletePCInfo, permanentDeletePCInfos } from './services/pcinfoService';
import { getInstalledSoftwareByPCId } from './services/installedSoftwareService';

import { onAuthStateChange, signOut } from './services/authService';
import { exportPCToCSV, exportPCToExcel, exportPCToPDF } from './utils/exportUtils';
import Login from './components/Login';
import PrinterManagement from './components/PrinterManagement';
import NetworkManagement from './components/NetworkManagement';

function App() {
  // 認證狀態
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // 分頁狀態 ('pc' | 'printer' | 'network')
  const [currentTab, setCurrentTab] = useState('pc');
  const [printerCount, setPrinterCount] = useState(0);
  const [networkCount, setNetworkCount] = useState(0);

  const [pcInfoList, setPcInfoList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    computer_name: '',
    cpu_name: '',
    description: '',
    notes: '',
    custodian: '',
    asset_id: '',
    cores: '',
    logical_processors: '',
    os_name: '',
    os_version: '',
    os_architecture: '',
    os_install_date: '',
    hostname: '',
    ip_address: '',
    ram_gb: '',
    hdd_info: '',
    vga_name: '',
    vga_ram_mb: '',
    uuid: '',
    // BIOS 資訊
    bios_vendor: '',
    bios_version: '',
    bios_release_date: '',
    bios_manufacture_date: '',
    notes_ii: ''
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  // 支援多行 CPU 核心 / 邏輯處理器呈現
  const [coresList, setCoresList] = useState([]);
  const [logicalList, setLogicalList] = useState([]);
  // 已安裝的軟體狀態（用於編輯表單）
  const [installedSoftware, setInstalledSoftware] = useState([]);
  const [loadingSoftware, setLoadingSoftware] = useState(false);
  const [showSoftwareSection, setShowSoftwareSection] = useState(false);

  // 顯示隱藏項目狀態
  const [showHiddenItems, setShowHiddenItems] = useState(false);

  const notesRef = React.useRef(null);

  // Sync notes_ii content to div only when it differs (avoids cursor jumping)
  useEffect(() => {
    if (notesRef.current && notesRef.current.innerHTML !== formData.notes_ii) {
      notesRef.current.innerHTML = formData.notes_ii || '';
    }
  }, [formData.notes_ii, showForm]);

  // 分頁狀態
  // 分頁狀態
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [copySuccess, setCopySuccess] = useState(null); // { id: number, text: string }

  // 排序邏輯
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedPCList = React.useMemo(() => {
    let sortableItems = [...pcInfoList];

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

        // 數值比較 (如 RAM)
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
        }

        // 字串比較
        if (String(aValue).toLowerCase() < String(bValue).toLowerCase()) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (String(aValue).toLowerCase() > String(bValue).toLowerCase()) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [pcInfoList, sortConfig, showHiddenItems]);

  const getSortIndicator = (name) => {
    if (sortConfig.key === name) {
      return sortConfig.direction === 'ascending' ? ' 🔼' : ' 🔽';
    }
    return '';
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

  // 監聽認證狀態
  useEffect(() => {
    const subscription = onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // 載入所有資料 (只在已登入時)
  useEffect(() => {
    if (user) {
      fetchPCInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchPCInfo = async () => {
    setLoading(true);
    const { data, error } = await getAllPCInfo();
    if (error) {
      setError('無法載入資料: ' + error.message);
    } else {
      setPcInfoList(data || []);
    }
    setLoading(false);
  };

  // 處理表單輸入
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // 保持輸入原始字串，避免 type 切換導致受控元件顯示問題
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleContentChange = (e) => {
    setFormData(prev => ({
      ...prev,
      notes_ii: e.target.innerHTML
    }));
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

  // 重置表單
  const resetForm = () => {
    setFormData({
      computer_name: '',
      cpu_name: '',
      description: '',
      notes: '',
      custodian: '',
      asset_id: '',
      cores: '',
      logical_processors: '',
      os_name: '',
      os_version: '',
      os_architecture: '',
      os_install_date: '',
      hostname: '',
      ip_address: '',
      ram_gb: '',
      hdd_info: '',
      vga_name: '',
      vga_ram_mb: '',
      uuid: '',
      // BIOS
      bios_vendor: '',
      bios_version: '',
      bios_release_date: '',
      bios_manufacture_date: '',
      notes_ii: ''
    });
    setEditingId(null);
    setShowForm(false);
    setCoresList([]);
    setLogicalList([]);
  };

  const validateForm = (data, isUpdate = false, currentId = null) => {
    // 1. Check for duplicate IP
    if (data.ip_address) {
      const duplicateIP = pcInfoList.find(item =>
        item.ip_address === data.ip_address &&
        (!isUpdate || item.id !== currentId)
      );
      if (duplicateIP) {
        return 'IP 地址已存在於系統中';
      }
    }

    // 2. Check for identical record (checking key fields)
    const duplicateRecord = pcInfoList.find(item =>
      item.computer_name === data.computer_name &&
      item.ip_address === data.ip_address &&
      item.asset_id === data.asset_id &&
      item.uuid === data.uuid &&
      (!isUpdate || item.id !== currentId)
    );

    if (duplicateRecord) {
      return '系統中已存在完全相同的詳細資料 (電腦名稱/IP/財編/UUID)';
    }

    return null;
  };

  // 新增記錄
  const handleCreate = async (e) => {
    e.preventDefault();

    const dataToSubmit = {
      ...formData,
      cores: coresList.length > 0 ? coresList.join(',') : (formData.cores || null),
      logical_processors: logicalList.length > 0 ? logicalList.join(',') : (formData.logical_processors || null),
      ram_gb: formData.ram_gb !== '' ? parseFloat(formData.ram_gb) : null,
      vga_ram_mb: formData.vga_ram_mb !== '' ? Number(formData.vga_ram_mb) : null,
      os_install_date: formData.os_install_date || null,
      bios_release_date: formData.bios_release_date || null,
      bios_manufacture_date: formData.bios_manufacture_date || null
    };

    const validationError = validateForm(dataToSubmit);
    if (validationError) {
      setError(validationError);
      return;
    }

    const { error } = await createPCInfo({
      ...dataToSubmit,
      notes_ii: notesRef.current ? notesRef.current.innerHTML : formData.notes_ii
    });
    if (error) {
      setError('新增失敗: ' + error.message);
    } else {
      await fetchPCInfo();
      resetForm();
    }
  };

  // 更新記錄
  const handleUpdate = async (e) => {
    e.preventDefault();

    const dataToSubmit = {
      ...formData,
      cores: coresList.length > 0 ? coresList.join(',') : (formData.cores || null),
      logical_processors: logicalList.length > 0 ? logicalList.join(',') : (formData.logical_processors || null),
      ram_gb: formData.ram_gb !== '' ? parseFloat(formData.ram_gb) : null,
      vga_ram_mb: formData.vga_ram_mb !== '' ? Number(formData.vga_ram_mb) : null,
      os_install_date: formData.os_install_date || null,
      bios_release_date: formData.bios_release_date || null,
      bios_manufacture_date: formData.bios_manufacture_date || null
    };

    const validationError = validateForm(dataToSubmit, true, editingId);
    if (validationError) {
      setError(validationError);
      return;
    }

    const { error } = await updatePCInfo(editingId, {
      ...dataToSubmit,
      notes_ii: notesRef.current ? notesRef.current.innerHTML : formData.notes_ii
    });
    if (error) {
      setError('更新失敗: ' + error.message);
    } else {
      await fetchPCInfo();
      resetForm();
    }
  };

  // 開始編輯
  const handleEdit = async (pc) => {
    setFormData({
      computer_name: pc.computer_name || '',
      cpu_name: pc.cpu_name || '',
      description: pc.description || '',
      notes: pc.notes || '',
      custodian: pc.custodian || '',
      asset_id: pc.asset_id || '',
      cores: pc.cores != null ? String(pc.cores) : '',
      logical_processors: pc.logical_processors != null ? String(pc.logical_processors) : '',
      os_name: pc.os_name || '',
      os_version: pc.os_version || '',
      os_architecture: pc.os_architecture || '',
      os_install_date: pc.os_install_date ? pc.os_install_date.split('T')[0] : '',
      hostname: pc.hostname || '',
      ip_address: pc.ip_address || '',
      ram_gb: pc.ram_gb != null ? String(pc.ram_gb) : '',
      hdd_info: pc.hdd_info || '',
      vga_name: pc.vga_name || '',
      vga_ram_mb: pc.vga_ram_mb != null ? String(pc.vga_ram_mb) : '',
      uuid: pc.uuid || '',
      // BIOS
      bios_vendor: pc.bios_vendor || '',
      bios_version: pc.bios_version || '',
      bios_release_date: pc.bios_release_date ? (pc.bios_release_date.split ? pc.bios_release_date.split('T')[0] : pc.bios_release_date) : '',
      bios_manufacture_date: pc.bios_manufacture_date ? (pc.bios_manufacture_date.split ? pc.bios_manufacture_date.split('T')[0] : pc.bios_manufacture_date) : '',
      notes_ii: pc.notes_ii || ''
    });
    // 如果資料中 cores/logical_processors 是多筆（逗號分隔或陣列），把它們拆成 list 供多行編輯
    if (pc.cores != null) {
      if (Array.isArray(pc.cores)) setCoresList(pc.cores.map(x => String(x)));
      else if (typeof pc.cores === 'string' && pc.cores.includes(',')) setCoresList(pc.cores.split(',').map(s => s.trim()));
      else setCoresList([]);
    } else {
      setCoresList([]);
    }

    if (pc.logical_processors != null) {
      if (Array.isArray(pc.logical_processors)) setLogicalList(pc.logical_processors.map(x => String(x)));
      else if (typeof pc.logical_processors === 'string' && pc.logical_processors.includes(',')) setLogicalList(pc.logical_processors.split(',').map(s => s.trim()));
      else setLogicalList([]);
    } else {
      setLogicalList([]);
    }

    // 載入已安裝的軟體
    setLoadingSoftware(true);
    setShowSoftwareSection(false); // 預設收折
    const { data, error } = await getInstalledSoftwareByPCId(pc.id);
    if (error) {
      console.error('Error loading installed software:', error);
      setInstalledSoftware([]);
    } else {
      setInstalledSoftware(data || []);
    }
    setLoadingSoftware(false);

    setEditingId(pc.id);
    setShowForm(true);
  };

  // 複製新增
  const handleClone = async (pc) => {
    setFormData({
      computer_name: pc.computer_name || '',
      cpu_name: pc.cpu_name || '',
      description: pc.description || '',
      notes: pc.notes || '',
      custodian: pc.custodian || '',
      asset_id: pc.asset_id || '',
      cores: pc.cores != null ? String(pc.cores) : '',
      logical_processors: pc.logical_processors != null ? String(pc.logical_processors) : '',
      os_name: pc.os_name || '',
      os_version: pc.os_version || '',
      os_architecture: pc.os_architecture || '',
      os_install_date: pc.os_install_date ? pc.os_install_date.split('T')[0] : '',
      hostname: pc.hostname || '',
      ip_address: pc.ip_address || '',
      ram_gb: pc.ram_gb != null ? String(pc.ram_gb) : '',
      hdd_info: pc.hdd_info || '',
      vga_name: pc.vga_name || '',
      vga_ram_mb: pc.vga_ram_mb != null ? String(pc.vga_ram_mb) : '',
      uuid: pc.uuid || '',
      // BIOS
      bios_vendor: pc.bios_vendor || '',
      bios_version: pc.bios_version || '',
      bios_release_date: pc.bios_release_date ? (pc.bios_release_date.split ? pc.bios_release_date.split('T')[0] : pc.bios_release_date) : '',
      bios_manufacture_date: pc.bios_manufacture_date ? (pc.bios_manufacture_date.split ? pc.bios_manufacture_date.split('T')[0] : pc.bios_manufacture_date) : '',
      notes_ii: pc.notes_ii || ''
    });
    // 如果資料中 cores/logical_processors 是多筆（逗號分隔或陣列），把它們拆成 list 供多行編輯
    if (pc.cores != null) {
      if (Array.isArray(pc.cores)) setCoresList(pc.cores.map(x => String(x)));
      else if (typeof pc.cores === 'string' && pc.cores.includes(',')) setCoresList(pc.cores.split(',').map(s => s.trim()));
      else setCoresList([]);
    } else {
      setCoresList([]);
    }

    if (pc.logical_processors != null) {
      if (Array.isArray(pc.logical_processors)) setLogicalList(pc.logical_processors.map(x => String(x)));
      else if (typeof pc.logical_processors === 'string' && pc.logical_processors.includes(',')) setLogicalList(pc.logical_processors.split(',').map(s => s.trim()));
      else setLogicalList([]);
    } else {
      setLogicalList([]);
    }

    // 載入已安裝的軟體
    setLoadingSoftware(true);
    setShowSoftwareSection(false); // 預設收折
    const { data, error } = await getInstalledSoftwareByPCId(pc.id);
    if (error) {
      console.error('Error loading installed software:', error);
      setInstalledSoftware([]);
    } else {
      setInstalledSoftware(data || []);
    }
    setLoadingSoftware(false);

    setEditingId(null); // Set to null for clone
    setShowForm(true);
  };

  // CPU 多行處理 helpers
  const handleAddCore = () => setCoresList(prev => [...prev, '']);
  const handleRemoveCore = (index) => setCoresList(prev => prev.filter((_, i) => i !== index));
  const handleCoreChange = (index, value) => setCoresList(prev => prev.map((v, i) => i === index ? value : v));

  const handleAddLogical = () => setLogicalList(prev => [...prev, '']);
  const handleRemoveLogical = (index) => setLogicalList(prev => prev.filter((_, i) => i !== index));
  const handleLogicalChange = (index, value) => setLogicalList(prev => prev.map((v, i) => i === index ? value : v));

  // debounce 搜尋：當 searchQuery 變動時呼叫 server-side search（若為空則取全部）
  useEffect(() => {
    const handler = setTimeout(async () => {
      try {
        if (!searchQuery || searchQuery.trim() === '') {
          await fetchPCInfo();
          return;
        }
        setLoading(true);
        const { data, error } = await searchPCInfo(searchQuery.trim());
        if (error) {
          setError('搜尋失敗: ' + error.message);
        } else {
          setPcInfoList(data || []);
        }
      } catch (err) {
        setError('搜尋時發生錯誤');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 搜尋時重置到第 1 頁
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // 刪除記錄

  // 刪除記錄
  const handleDelete = (item) => {
    setDeleteTarget({ type: 'single', id: item.id, mode: 'hide', name: item.computer_name });
    setDeleteConfirmText('');
    setShowDeleteModal(true);
  };

  const handlePermanentDelete = (item) => {
    setDeleteTarget({ type: 'single', id: item.id, mode: 'delete', name: item.computer_name });
    setDeleteConfirmText('');
    setShowDeleteModal(true);
  };

  const handleRestore = (item) => {
    setDeleteTarget({ type: 'single', id: item.id, mode: 'restore', name: item.computer_name });
    setDeleteConfirmText('');
    setShowDeleteModal(true);
  };

  // 執行刪除
  const executeDelete = async () => {
    const modeText = deleteTarget.mode === 'delete' ? 'DELETE' : (deleteTarget.mode === 'restore' ? 'RESTORE' : 'HIDE');
    const modeActionText = deleteTarget.mode === 'delete' ? '刪除' : (deleteTarget.mode === 'restore' ? '還原' : '隱藏');

    if (deleteConfirmText !== modeText) {
      setError(`請輸入 "${modeText}" 以確認${modeActionText}`);
      return;
    }

    if (deleteTarget.mode === 'delete') {
      if (deleteTarget.type === 'single') {
        const { error } = await permanentDeletePCInfo(deleteTarget.id);
        if (error) {
          setError('永久刪除失敗: ' + error.message);
        } else {
          await fetchPCInfo();
          setSelectedIds(prev => prev.filter(x => x !== deleteTarget.id));
        }
      }
    } else if (deleteTarget.mode === 'restore') {
      if (deleteTarget.type === 'single') {
        const { error } = await restorePCInfo(deleteTarget.id);
        if (error) {
          setError('還原失敗: ' + error.message);
        } else {
          await fetchPCInfo();
        }
      } else {
        const { error } = await restorePCInfos(deleteTarget.ids);
        if (error) {
          setError('批次還原失敗: ' + error.message);
        } else {
          await fetchPCInfo();
          setSelectedIds([]);
        }
      }
    } else {
      if (deleteTarget.type === 'single') {
        const { error } = await deletePCInfo(deleteTarget.id);
        if (error) {
          setError('隱藏失敗: ' + error.message);
        } else {
          await fetchPCInfo();
          setSelectedIds(prev => prev.filter(x => x !== deleteTarget.id));
        }
      } else if (deleteTarget.type === 'bulk') {
        const { error } = await deletePCInfos(deleteTarget.ids);
        if (error) {
          setError('批次隱藏失敗: ' + error.message);
        } else {
          await fetchPCInfo();
          setSelectedIds([]);
        }
      }
    }

    if (deleteTarget.mode === 'delete' && deleteTarget.type === 'bulk') {
      const { error } = await permanentDeletePCInfos(deleteTarget.ids);
      if (error) {
        setError('批次永久刪除失敗: ' + error.message);
      } else {
        await fetchPCInfo();
        setSelectedIds([]);
      }
    }

    setShowDeleteModal(false);
    setDeleteTarget(null);
    setDeleteConfirmText('');
  };

  // 切換單筆選取
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      return [...prev, id];
    });
  };

  // 全選/取消全選
  const selectAll = (checked) => {
    if (checked) setSelectedIds(sortedPCList.map(pc => pc.id));
    else setSelectedIds([]);
  };

  // 批次操作 (刪除/還原)
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const mode = showHiddenItems ? 'restore' : 'hide';
    setDeleteTarget({ type: 'bulk', ids: selectedIds, mode });
    setDeleteConfirmText('');
    setShowDeleteModal(true);
  };

  // 格式化日期顯示
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
  const isModifiedOrCreatedToday = (pc) => {
    // 檢查 created_at 或 updated_at 是否為今日
    return isToday(pc.created_at) || isToday(pc.updated_at);
  };

  // 檢視 modal 狀態與處理
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewPc, setViewPc] = useState(null);

  // 刪除確認 modal 狀態
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'single', id } or { type: 'bulk', ids }
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleView = (pc) => {
    setViewPc(pc);
    setShowViewModal(true);
  };

  const closeView = () => {
    setShowViewModal(false);
    setViewPc(null);
  };

  // 登出處理
  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      setError('登出失敗: ' + error.message);
    }
    // 認證狀態會自動更新
  };

  // 分頁邏輯
  // 分頁邏輯
  const totalPages = Math.ceil(sortedPCList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPCList = sortedPCList.slice(startIndex, endIndex);

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

  // 認證載入中
  if (authLoading) {
    return (
      <div className="App">
        <div className="auth-loading">
          <div className="spinner"></div>
          <p>載入中...</p>
        </div>
      </div>
    );
  }

  // 未登入，顯示登入頁面
  if (!user) {
    return <Login onLoginSuccess={(user) => setUser(user)} />;
  }

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <div className="header-content">
            <div className="header-title">
              <h1>🖥️ Stork 資訊管理系統</h1>
              <p className="subtitle">電腦硬體資訊查詢與管理</p>
            </div>
            <div className="header-user">
              {currentTab === 'pc' && (
                <span className="pc-count">💻 電腦總數: <strong>{sortedPCList.length}</strong></span>
              )}
              {currentTab === 'printer' && (
                <span className="pc-count">🖨️ 印表機總數: <strong>{printerCount}</strong></span>
              )}
              {currentTab === 'network' && (
                <span className="pc-count">🌐 網路設備總數: <strong>{networkCount}</strong></span>
              )}
              <span className="user-email">👤 {user.email}</span>
              <button className="btn-logout" onClick={handleLogout}>
                🚪 登出
              </button>
            </div>
          </div>
        </header>

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

        <div className="tabs">
          <button
            className={`tab-btn tab-pc ${currentTab === 'pc' ? 'active' : ''}`}
            onClick={() => setCurrentTab('pc')}
          >
            💻 電腦資訊 ({sortedPCList.length})
          </button>
          <button
            className={`tab-btn tab-printer ${currentTab === 'printer' ? 'active' : ''}`}
            onClick={() => setCurrentTab('printer')}
          >
            🖨️ 印表機資訊 ({printerCount})
          </button>
          <button
            className={`tab-btn tab-network ${currentTab === 'network' ? 'active' : ''}`}
            onClick={() => setCurrentTab('network')}
          >
            🌐 網路設備 ({networkCount})
          </button>
        </div>

        {currentTab === 'printer' ? (
          <PrinterManagement onCountChange={setPrinterCount} />
        ) : currentTab === 'network' ? (
          <NetworkManagement onCountChange={setNetworkCount} />
        ) : (
          <>
            <div className="actions">
              <button
                className="btn btn-primary"
                onClick={() => {
                  resetForm();
                  setShowForm(!showForm);
                }}
              >
                {showForm ? '✕ 取消' : '➕ 新增電腦資訊'}
              </button>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="搜尋：電腦名稱 / CPU / IP / UUID / 作業系統 / 註解 / 財編 / 設備保管人 / 已安裝軟體"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <button className="btn btn-secondary" onClick={() => { setSearchQuery(''); fetchPCInfo(); }}>
                  ✖ 清除
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={fetchPCInfo}
                >
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
                    const filename = `pc_info_export_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${new Date().toTimeString().slice(0, 5).replace(/:/g, '')}`;
                    try { exportPCToCSV(sortedPCList, filename); } catch (e) { alert('匯出失敗: ' + e.message); }
                  }}>
                    📄 CSV
                  </button>
                  <button className="btn btn-secondary" onClick={() => {
                    const filename = `pc_info_export_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${new Date().toTimeString().slice(0, 5).replace(/:/g, '')}`;
                    try { exportPCToExcel(sortedPCList, filename); } catch (e) { alert('匯出失敗: ' + e.message); }
                  }}>
                    📊 Excel
                  </button>
                  <button className="btn btn-secondary" onClick={async () => {
                    const filename = `pc_info_export_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${new Date().toTimeString().slice(0, 5).replace(/:/g, '')}`;
                    try { await exportPCToPDF(sortedPCList, filename); } catch (e) { alert('匯出失敗: ' + e.message); }
                  }}>
                    📑 PDF
                  </button>
                  <button
                    className={`btn ${showHiddenItems ? 'btn-warning' : 'btn-secondary'}`}
                    onClick={() => setShowHiddenItems(!showHiddenItems)}
                    title={showHiddenItems ? "切換回一般列表" : "切換至已隱藏列表"}
                  >
                    {showHiddenItems ? '👁️ 顯示正常' : `👁️ 顯示隱藏 (${pcInfoList.filter(pc => pc.is_hidden).length})`}
                  </button>
                </div>
              </div>
            </div>

            {showForm && (
              <div className="form-container">
                <h2>{editingId ? '✏️ 編輯電腦資訊' : '➕ 新增電腦資訊'}</h2>
                <form onSubmit={editingId ? handleUpdate : handleCreate}>
                  <div className="form-grid">
                    <div className="form-section">
                      <h3>基本資訊</h3>
                      <div className="form-group">
                        <label>電腦名稱 <span className="required">*</span></label>
                        <input
                          type="text"
                          name="computer_name"
                          value={formData.computer_name}
                          onChange={handleInputChange}
                          required
                          placeholder="例如: DESKTOP-001"
                        />
                      </div>
                      <div className="form-group">
                        <label>UUID</label>
                        <input
                          type="text"
                          name="uuid"
                          value={formData.uuid}
                          onChange={handleInputChange}
                          placeholder="例如: 550e8400-e29b-41d4-a716-446655440000"
                        />
                      </div>
                      <div className="form-group">
                        <label>描述</label>
                        <input
                          type="text"
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          placeholder="例如: 辦公室電腦"
                        />
                      </div>
                      <div className="form-group highlight-field">
                        <label>備註</label>
                        <input
                          type="text"
                          name="notes"
                          value={formData.notes}
                          onChange={handleInputChange}
                          placeholder="例如: 需要升級記憶體"
                        />
                      </div>
                      <div className="form-group highlight-field">
                        <label>設備保管人</label>
                        <input
                          type="text"
                          name="custodian"
                          value={formData.custodian}
                          onChange={handleInputChange}
                          placeholder="例如: 張三"
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
                      <div className="form-group">
                        <label>主機名稱</label>
                        <input
                          type="text"
                          name="hostname"
                          value={formData.hostname}
                          onChange={handleInputChange}
                          placeholder="例如: PC-OFFICE-01"
                        />
                      </div>
                      <div className="form-group">
                        <label>IP 地址</label>
                        <input
                          type="text"
                          name="ip_address"
                          value={formData.ip_address}
                          onChange={handleInputChange}
                          placeholder="例如: 192.168.1.100"
                        />
                      </div>
                    </div>

                    <div className="form-section">
                      <h3>CPU 資訊</h3>
                      <div className="form-group">
                        <label>CPU 名稱 <span className="required">*</span></label>
                        <input
                          type="text"
                          name="cpu_name"
                          value={formData.cpu_name}
                          onChange={handleInputChange}
                          required
                          placeholder="例如: Intel Core i7-12700K"
                        />
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>核心數</label>
                          {coresList && coresList.length > 0 ? (
                            <div className="multiline-list">
                              {coresList.map((c, idx) => (
                                <div key={idx} className="multiline-row">
                                  <input
                                    type="number"
                                    value={c}
                                    onChange={(e) => handleCoreChange(idx, e.target.value)}
                                    placeholder="例如: 4"
                                  />
                                  <button type="button" className="btn-small" onClick={() => handleRemoveCore(idx)}>✕</button>
                                </div>
                              ))}
                              <button type="button" className="btn-small" onClick={handleAddCore}>＋ 新增核心行</button>
                            </div>
                          ) : (
                            <input
                              type="number"
                              name="cores"
                              value={formData.cores}
                              onChange={handleInputChange}
                              placeholder="例如: 12"
                            />
                          )}
                        </div>
                        <div className="form-group">
                          <label>邏輯處理器</label>
                          {logicalList && logicalList.length > 0 ? (
                            <div className="multiline-list">
                              {logicalList.map((l, idx) => (
                                <div key={idx} className="multiline-row">
                                  <input
                                    type="number"
                                    value={l}
                                    onChange={(e) => handleLogicalChange(idx, e.target.value)}
                                    placeholder="例如: 8"
                                  />
                                  <button type="button" className="btn-small" onClick={() => handleRemoveLogical(idx)}>✕</button>
                                </div>
                              ))}
                              <button type="button" className="btn-small" onClick={handleAddLogical}>＋ 新增邏輯行</button>
                            </div>
                          ) : (
                            <input
                              type="number"
                              name="logical_processors"
                              value={formData.logical_processors}
                              onChange={handleInputChange}
                              placeholder="例如: 20"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="form-section">
                      <h3>作業系統</h3>
                      <div className="form-group">
                        <label>系統名稱</label>
                        <input
                          type="text"
                          name="os_name"
                          value={formData.os_name}
                          onChange={handleInputChange}
                          placeholder="例如: Windows 11 Pro"
                        />
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>系統版本</label>
                          <input
                            type="text"
                            name="os_version"
                            value={formData.os_version}
                            onChange={handleInputChange}
                            placeholder="例如: 22H2"
                          />
                        </div>
                        <div className="form-group">
                          <label>系統架構</label>
                          <input
                            type="text"
                            name="os_architecture"
                            value={formData.os_architecture}
                            onChange={handleInputChange}
                            placeholder="例如: x64"
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>安裝日期</label>
                        <input
                          type="date"
                          name="os_install_date"
                          value={formData.os_install_date}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div className="form-section">
                      <h3>硬體資訊</h3>
                      <div className="form-group">
                        <label>記憶體大小 (GB)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="ram_gb"
                          value={formData.ram_gb}
                          onChange={handleInputChange}
                          placeholder="例如: 16.00"
                        />
                      </div>
                      <div className="form-group">
                        <label>硬碟資訊</label>
                        <input
                          type="text"
                          name="hdd_info"
                          value={formData.hdd_info}
                          onChange={handleInputChange}
                          placeholder="例如: 500GB NVMe SSD"
                        />
                      </div>
                      <div className="form-group">
                        <label>顯示卡名稱</label>
                        <input
                          type="text"
                          name="vga_name"
                          value={formData.vga_name}
                          onChange={handleInputChange}
                          placeholder="例如: NVIDIA RTX 3060"
                        />
                      </div>
                      <div className="form-group">
                        <label>顯示卡記憶體 (MB)</label>
                        <input
                          type="number"
                          name="vga_ram_mb"
                          value={formData.vga_ram_mb}
                          onChange={handleInputChange}
                          placeholder="例如: 12288"
                        />
                      </div>
                    </div>

                    <div className="form-section">
                      <h3>BIOS 資訊</h3>
                      <div className="form-group">
                        <label>BIOS 廠商</label>
                        <input
                          type="text"
                          name="bios_vendor"
                          value={formData.bios_vendor}
                          onChange={handleInputChange}
                          placeholder="例如: American Megatrends"
                        />
                      </div>
                      <div className="form-group">
                        <label>BIOS 版本</label>
                        <input
                          type="text"
                          name="bios_version"
                          value={formData.bios_version}
                          onChange={handleInputChange}
                          placeholder="例如: 1.2.3"
                        />
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>BIOS 釋出日</label>
                          <input
                            type="date"
                            name="bios_release_date"
                            value={formData.bios_release_date}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="form-group">
                          <label>出廠日期</label>
                          <input
                            type="date"
                            name="bios_manufacture_date"
                            value={formData.bios_manufacture_date}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 已安裝的軟體區塊 - 只在編輯模式顯示 */}
                  {editingId && (
                    <div className="software-section-container">
                      <div
                        className="software-section-header"
                        onClick={() => setShowSoftwareSection(!showSoftwareSection)}
                      >
                        <h3>
                          📦 已安裝的軟體 ({installedSoftware.length})
                          <span className="toggle-icon">{showSoftwareSection ? '▼' : '▶'}</span>
                        </h3>
                      </div>
                      {showSoftwareSection && (
                        <div className="software-section-content">
                          {loadingSoftware ? (
                            <div className="software-loading">載入中...</div>
                          ) : installedSoftware.length === 0 ? (
                            <div className="software-empty">尚無軟體資料</div>
                          ) : (
                            <div className="software-table-container">
                              <table className="software-table">
                                <thead>
                                  <tr>
                                    <th>軟體名稱</th>
                                    <th>版本</th>
                                    <th>發行商</th>
                                    <th>安裝日期</th>
                                    <th>大小 (MB)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {installedSoftware.map((software) => (
                                    <tr key={software.id}>
                                      <td>{software.software_name || '-'}</td>
                                      <td>{software.version || '-'}</td>
                                      <td>{software.publisher || '-'}</td>
                                      <td>{software.install_date ? formatDate(software.install_date) : '-'}</td>
                                      <td>{software.size_mb ? Number(software.size_mb).toFixed(2) : '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

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

                  <div className="form-actions">
                    <button type="button" className="btn btn-secondary" onClick={resetForm}>
                      ✕ 取消
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingId ? '💾 更新' : '➕ 新增'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {showViewModal && viewPc && (
              <div className="modal-overlay" onClick={closeView}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>檢視 — {viewPc.computer_name || '詳細資料'}</h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        className="modal-edit"
                        onClick={() => {
                          // 先關閉 modal，然後切換到編輯模式
                          closeView();
                          handleEdit(viewPc);
                        }}
                      >
                        ✏️ 編輯
                      </button>
                      <button className="modal-close" onClick={closeView}>✕</button>
                    </div>
                  </div>
                  <div className="modal-content">
                    {viewPc.uuid && (
                      <div className="modal-row"><strong>UUID:</strong> <span>{viewPc.uuid}</span></div>
                    )}
                    {viewPc.description && (
                      <div className="modal-row"><strong>描述:</strong> <span>{viewPc.description}</span></div>
                    )}
                    {viewPc.notes && (
                      <div className="modal-row"><strong>備註:</strong> <span>{viewPc.notes}</span></div>
                    )}
                    {viewPc.custodian && (
                      <div className="modal-row"><strong>設備保管人:</strong> <span>{viewPc.custodian}</span></div>
                    )}
                    {viewPc.asset_id && (
                      <div className="modal-row"><strong>財編:</strong> <span>{viewPc.asset_id}</span></div>
                    )}
                    {viewPc.hostname && (
                      <div className="modal-row"><strong>主機名稱:</strong> <span>{viewPc.hostname}</span></div>
                    )}
                    {viewPc.ip_address && (
                      <div className="modal-row"><strong>IP 地址:</strong> <span>{viewPc.ip_address}</span></div>
                    )}
                    {viewPc.cpu_name && (
                      <div className="modal-row"><strong>CPU:</strong> <span>{viewPc.cpu_name}</span></div>
                    )}
                    {(viewPc.cores || viewPc.logical_processors) && (
                      <div className="modal-row"><strong>核心 / 執行緒:</strong> <span>{viewPc.cores || '-'} / {viewPc.logical_processors || '-'}</span></div>
                    )}
                    {viewPc.ram_gb && (
                      <div className="modal-row"><strong>記憶體:</strong> <span>{viewPc.ram_gb} GB</span></div>
                    )}
                    {viewPc.os_name && (
                      <div className="modal-row"><strong>作業系統:</strong> <span>{viewPc.os_name} {viewPc.os_version ? `(${viewPc.os_version})` : ''}</span></div>
                    )}
                    {viewPc.os_install_date && (
                      <div className="modal-row"><strong>安裝日期:</strong> <span>{formatDate(viewPc.os_install_date)}</span></div>
                    )}
                    {viewPc.hdd_info && (
                      <div className="modal-row"><strong>硬碟:</strong> <span>{viewPc.hdd_info}</span></div>
                    )}
                    {viewPc.vga_name && (
                      <div className="modal-row"><strong>顯示卡:</strong> <span>{viewPc.vga_name} {viewPc.vga_ram_mb ? `(${viewPc.vga_ram_mb} MB)` : ''}</span></div>
                    )}
                    {viewPc.bios_vendor && (
                      <div className="modal-row"><strong>BIOS 廠商:</strong> <span>{viewPc.bios_vendor}</span></div>
                    )}
                    {viewPc.bios_version && (
                      <div className="modal-row"><strong>BIOS 版本:</strong> <span>{viewPc.bios_version}</span></div>
                    )}
                    {viewPc.bios_release_date && (
                      <div className="modal-row"><strong>BIOS 釋出日:</strong> <span>{new Date(viewPc.bios_release_date).toLocaleDateString('zh-TW')}</span></div>
                    )}
                    {viewPc.bios_manufacture_date && (
                      <div className="modal-row"><strong>出廠日期:</strong> <span>{new Date(viewPc.bios_manufacture_date).toLocaleDateString('zh-TW')}</span></div>
                    )}
                    {viewPc.notes_ii && (
                      <div className="modal-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <strong>備註 II:</strong>
                        <div
                          className="rich-content-view"
                          dangerouslySetInnerHTML={{ __html: viewPc.notes_ii }}
                          style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '10px',
                            marginTop: '5px',
                            width: '100%',
                            background: '#f8fafc'
                          }}
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
                        <p>您即將<strong>還原</strong>這筆電腦資訊記錄。</p>
                      ) : (
                        deleteTarget.type === 'single' ? (
                          <p>您即將{deleteTarget.mode === 'delete' ? '永久刪除' : '隱藏'}這筆電腦資訊記錄。{deleteTarget.mode === 'delete' ? <strong>此操作無法復原。</strong> : '隱藏後可於「顯示隱藏」列表中還原。'}</p>
                        ) : (
                          <p>您即將{deleteTarget.mode === 'delete' ? '永久刪除' : '隱藏'} <strong>{deleteTarget.ids.length}</strong> 筆電腦資訊記錄。{deleteTarget.mode === 'delete' ? <strong>此操作無法復原。</strong> : '隱藏後可於「顯示隱藏」列表中還原。'}</p>
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
              {loading ? (
                <div className="loading">
                  <div className="spinner"></div>
                  <p>載入中...</p>
                </div>
              ) : pcInfoList.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <h3>尚無資料</h3>
                  <p>點擊上方「新增電腦資訊」按鈕來新增第一筆記錄</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="pc-table">
                    <thead>
                      <tr>
                        <th>
                          <input
                            type="checkbox"
                            checked={sortedPCList.length > 0 && selectedIds.length === sortedPCList.length && sortedPCList.every(pc => selectedIds.includes(pc.id))}
                            onChange={(e) => { e.stopPropagation(); selectAll(e.target.checked); }}
                            title="全選"
                          />
                        </th>
                        <th onClick={() => requestSort('computer_name')} style={{ cursor: 'pointer' }}>
                          電腦名稱 {getSortIndicator('computer_name')}
                        </th>

                        <th onClick={() => requestSort('cpu_name')} style={{ cursor: 'pointer' }}>
                          CPU {getSortIndicator('cpu_name')}
                        </th>
                        <th onClick={() => requestSort('ram_gb')} style={{ cursor: 'pointer' }}>
                          記憶體 {getSortIndicator('ram_gb')}
                        </th>
                        <th onClick={() => requestSort('hdd_info')} style={{ cursor: 'pointer' }}>
                          硬碟資訊 {getSortIndicator('hdd_info')}
                        </th>
                        <th onClick={() => requestSort('os_name')} style={{ cursor: 'pointer' }}>
                          作業系統 {getSortIndicator('os_name')}
                        </th>
                        <th onClick={() => requestSort('ip_address')} style={{ cursor: 'pointer' }}>
                          IP 地址 {getSortIndicator('ip_address')}
                        </th>
                        {showHiddenItems && (
                          <>
                            <th onClick={() => requestSort('is_hidden')} style={{ cursor: 'pointer' }}>隱藏{getSortIndicator('is_hidden')}</th>
                            <th onClick={() => requestSort('hidden_at')} style={{ cursor: 'pointer' }}>隱藏日期{getSortIndicator('hidden_at')}</th>
                          </>
                        )}
                        <th>動作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentPCList.map((pc) => {
                        // 組合 className：檢查是否有備註 或 今日新增/異動
                        const classNames = [];
                        if (pc.notes && pc.notes.trim() !== '') classNames.push('row-with-notes');
                        if (isModifiedOrCreatedToday(pc)) classNames.push('row-today-modified');

                        return (
                          <tr key={pc.id} className={classNames.join(' ')}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(pc.id)}
                                onChange={(e) => { e.stopPropagation(); toggleSelect(pc.id); }}
                                title="選取此筆"
                              />
                            </td>
                            <td data-label="電腦名稱">
                              <div className="cell-content">
                                <strong>{pc.computer_name}</strong>
                                {pc.description && <span className="cell-subtext">{pc.description}</span>}
                              </div>
                            </td>

                            <td data-label="CPU">
                              <div className="cell-content">
                                <span>{pc.cpu_name}</span>
                                {pc.cores && <span className="cell-subtext">{pc.cores} 核心 / {pc.logical_processors} 執行緒</span>}
                              </div>
                            </td>
                            <td data-label="記憶體">
                              {pc.ram_gb ? `${pc.ram_gb} GB` : '-'}
                            </td>
                            <td data-label="硬碟資訊">
                              {pc.hdd_info || '-'}
                            </td>
                            <td data-label="作業系統">
                              <div className="cell-content">
                                <span>{pc.os_name}</span>
                                {pc.os_version && <span className="cell-subtext">{pc.os_version}</span>}
                              </div>
                            </td>
                            <td data-label="IP 地址">
                              <div className="cell-content" style={{ flexDirection: 'row', alignItems: 'center', gap: '5px' }}>
                                <span>{pc.ip_address || '-'}</span>
                                {pc.ip_address && (
                                  <div style={{ position: 'relative', display: 'inline-block' }}>
                                    <button
                                      className="btn-icon"
                                      onClick={(e) => { e.stopPropagation(); handleCopyIP(pc.ip_address, pc.id); }}
                                      title="複製 IP"
                                      style={{ padding: '2px 5px', fontSize: '0.9rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
                                    >
                                      📋
                                    </button>
                                    {copySuccess && copySuccess.id === pc.id && (
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
                            {showHiddenItems && (
                              <>
                                <td data-label="隱藏">
                                  <span style={{
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: pc.is_hidden ? '#fee2e2' : '#dcfce7',
                                    color: pc.is_hidden ? '#991b1b' : '#166534',
                                    fontSize: '0.85em'
                                  }}>
                                    {pc.is_hidden ? '是' : '否'}
                                  </span>
                                </td>
                                <td data-label="隱藏日期">{pc.hidden_at ? new Date(pc.hidden_at).toLocaleString('zh-TW') : '-'}</td>
                              </>
                            )}
                            <td data-label="動作">
                              <div className="action-buttons">
                                <button
                                  className="btn-icon btn-view"
                                  onClick={() => handleView(pc)}
                                  title="檢視"
                                >
                                  🔍
                                </button>
                                <button
                                  className="btn-icon btn-edit"
                                  onClick={() => handleEdit(pc)}
                                  title="編輯"
                                >
                                  ✏️
                                </button>
                                <button
                                  className="btn-icon btn-clone"
                                  onClick={() => handleClone(pc)}
                                  title="複製新增"
                                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem' }}
                                >
                                  📄
                                </button>
                                {pc.is_hidden ? (
                                  <>
                                    <button
                                      className="btn-icon btn-restore"
                                      onClick={() => handleRestore(pc)}
                                      title="還原"
                                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem' }}
                                    >
                                      ♻️
                                    </button>
                                    <button
                                      className="btn-icon btn-delete"
                                      onClick={() => handlePermanentDelete(pc)}
                                      title="永久刪除"
                                    >
                                      🗑️
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    className="btn-icon btn-delete"
                                    onClick={() => handleDelete(pc)}
                                    title="隱藏"
                                  >
                                    🗑️
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {sortedPCList.length > 0 && (
                    <div className="pagination-container">
                      <div className="pagination-info">
                        顯示 {startIndex + 1}-{Math.min(endIndex, sortedPCList.length)} / 共 {sortedPCList.length} 筆
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
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
