import { supabase } from '../supabaseClient';

/**
 * 獲取所有 PC 資訊記錄
 */
export const getAllPCInfo = async () => {
    try {
        const { data, error } = await supabase
            .from('pcinfo')
            .select('*')
            // 依 id 由大到小排序，讓最新的記錄顯示在最前面
            .order('id', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching PC info:', error);
        return { data: null, error };
    }
};

/**
 * 創建新的 PC 資訊記錄
 */
export const createPCInfo = async (pcData) => {
    try {
        const { data, error } = await supabase
            .from('pcinfo')
            .insert([pcData])
            .select();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error creating PC info:', error);
        return { data: null, error };
    }
};

/**
 * 更新 PC 資訊記錄
 */
export const updatePCInfo = async (id, pcData) => {
    try {
        const { data, error } = await supabase
            .from('pcinfo')
            .update(pcData)
            .eq('id', id)
            .select();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error updating PC info:', error);
        return { data: null, error };
    }
};

/**
 * 刪除 PC 資訊記錄 (改為隱藏)
 */
export const deletePCInfo = async (id) => {
    try {
        const { error } = await supabase
            .from('pcinfo')
            .update({
                is_hidden: true,
                hidden_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error hiding PC info:', error);
        return { error };
    }
};

/**
 * 批次刪除多筆 PC 資訊記錄 (改為隱藏)
 * @param {Array<number>} ids
 */
export const deletePCInfos = async (ids) => {
    try {
        const { error } = await supabase
            .from('pcinfo')
            .update({
                is_hidden: true,
                hidden_at: new Date().toISOString()
            })
            .in('id', ids);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error hiding multiple PC info:', error);
        return { error };
    }
};

/**
 * 永久刪除 PC 資訊記錄 (從資料庫移除)
 */
export const permanentDeletePCInfo = async (id) => {
    try {
        const { error } = await supabase
            .from('pcinfo')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error permanently deleting PC info:', error);
        return { error };
    }
};

/**
 * 批次永久刪除 PC 資訊記錄
 */
export const permanentDeletePCInfos = async (ids) => {
    try {
        const { error } = await supabase
            .from('pcinfo')
            .delete()
            .in('id', ids);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error permanently deleting multiple PC info:', error);
        return { error };
    }
};

/**
 * 還原隱藏的 PC 資訊記錄
 */
export const restorePCInfo = async (id) => {
    try {
        const { error } = await supabase
            .from('pcinfo')
            .update({
                is_hidden: false,
                hidden_at: null
            })
            .eq('id', id);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error restoring PC info:', error);
        return { error };
    }
};

/**
 * 批次還原 PC 資訊記錄
 */
export const restorePCInfos = async (ids) => {
    try {
        const { error } = await supabase
            .from('pcinfo')
            .update({
                is_hidden: false,
                hidden_at: null
            })
            .in('id', ids);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error restoring multiple PC info:', error);
        return { error };
    }
};

/**
 * 以關鍵字搜尋 PC 資訊（server-side）
 * 會在 `computer_name`, `cpu_name`, `ip_address`, `uuid`, `os_name`, `os_version`, `notes` 欄位做模糊比對
 * 也會搜尋 `installed_software` 的 `software_name`, `version`, `publisher` 欄位
 * 若資料表有大量資料，建議使用此 server-side 搜尋避免下載整張表
 * @param {string} query
 */
export const searchPCInfo = async (query) => {
    try {
        if (!query || query.trim() === '') {
            // 若 query 空白，改為取全部（最新在前）
            return await getAllPCInfo();
        }

        const q = `%${query}%`;

        // 先搜尋 pcinfo 表的欄位（包含 notes 和 custodian）
        const { data: pcData, error: pcError } = await supabase
            .from('pcinfo')
            .select('*')
            .or(
                `computer_name.ilike.${q},cpu_name.ilike.${q},ip_address.ilike.${q},uuid.ilike.${q},os_name.ilike.${q},os_version.ilike.${q},notes.ilike.${q},custodian.ilike.${q},asset_id.ilike.${q}`
            )
            .order('id', { ascending: false });

        if (pcError) throw pcError;

        // 搜尋 installed_software 表，找出符合的 pcinfo_id
        const { data: softwareData, error: softwareError } = await supabase
            .from('installed_software')
            .select('pcinfo_id')
            .or(
                `software_name.ilike.${q},version.ilike.${q},publisher.ilike.${q}`
            );

        if (softwareError) throw softwareError;

        // 取得所有符合軟體搜尋的 PC IDs
        const softwarePcIds = [...new Set(softwareData.map(s => s.pcinfo_id))];

        // 如果有符合的軟體，取得對應的 PC 資訊
        let softwarePcData = [];
        if (softwarePcIds.length > 0) {
            const { data: pcsFromSoftware, error: pcsError } = await supabase
                .from('pcinfo')
                .select('*')
                .in('id', softwarePcIds)
                .order('id', { ascending: false });

            if (pcsError) throw pcsError;
            softwarePcData = pcsFromSoftware || [];
        }

        // 合併兩個結果，去除重複
        const allPcIds = new Set();
        const mergedData = [];

        // 先加入 PC 資訊搜尋的結果
        pcData.forEach(pc => {
            if (!allPcIds.has(pc.id)) {
                allPcIds.add(pc.id);
                mergedData.push(pc);
            }
        });

        // 再加入軟體搜尋的結果
        softwarePcData.forEach(pc => {
            if (!allPcIds.has(pc.id)) {
                allPcIds.add(pc.id);
                mergedData.push(pc);
            }
        });

        // 按 id 降序排序
        mergedData.sort((a, b) => b.id - a.id);

        return { data: mergedData, error: null };
    } catch (error) {
        console.error('Error searching PC info:', error);
        return { data: null, error };
    }
};

