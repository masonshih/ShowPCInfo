import { supabase } from '../supabaseClient';

/**
 * 獲取所有網路設備資訊
 */
export const getAllNetworkEquipment = async () => {
    try {
        const { data, error } = await supabase
            .from('network_equipment')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching network equipment:', error);
        return { data: null, error };
    }
};

/**
 * 創建新的網路設備
 */
export const createNetworkEquipment = async (equipmentData) => {
    try {
        const { data, error } = await supabase
            .from('network_equipment')
            .insert([equipmentData])
            .select();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error creating network equipment:', error);
        return { data: null, error };
    }
};

/**
 * 更新網路設備
 */
export const updateNetworkEquipment = async (id, equipmentData) => {
    try {
        const { data, error } = await supabase
            .from('network_equipment')
            .update(equipmentData)
            .eq('id', id)
            .select();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error updating network equipment:', error);
        return { data: null, error };
    }
};

/**
 * 刪除網路設備 (改為隱藏)
 */
export const deleteNetworkEquipment = async (id) => {
    try {
        const { error } = await supabase
            .from('network_equipment')
            .update({
                is_hidden: true,
                hidden_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error hiding network equipment:', error);
        return { error };
    }
};

/**
 * 批次刪除多筆網路設備記錄 (改為隱藏)
 */
export const deleteNetworkEquipments = async (ids) => {
    try {
        const { error } = await supabase
            .from('network_equipment')
            .update({
                is_hidden: true,
                hidden_at: new Date().toISOString()
            })
            .in('id', ids);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error hiding multiple network equipments:', error);
        return { error };
    }
};

/**
 * 還原隱藏的網路設備
 */
export const restoreNetworkEquipment = async (id) => {
    try {
        const { error } = await supabase
            .from('network_equipment')
            .update({
                is_hidden: false,
                hidden_at: null
            })
            .eq('id', id);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error restoring network equipment:', error);
        return { error };
    }
};

/**
 * 批次還原網路設備
 */
export const restoreNetworkEquipments = async (ids) => {
    try {
        const { error } = await supabase
            .from('network_equipment')
            .update({
                is_hidden: false,
                hidden_at: null
            })
            .in('id', ids);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error restoring multiple network equipments:', error);
        return { error };
    }
};

/**
 * 永久刪除網路設備 (從資料庫移除)
 */
export const permanentDeleteNetworkEquipment = async (id) => {
    try {
        const { error } = await supabase
            .from('network_equipment')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error permanently deleting network equipment:', error);
        return { error };
    }
};

/**
 * 批次永久刪除網路設備 (從資料庫移除)
 */
export const permanentDeleteNetworkEquipments = async (ids) => {
    try {
        const { error } = await supabase
            .from('network_equipment')
            .delete()
            .in('id', ids);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error permanently deleting multiple network equipments:', error);
        return { error };
    }
};

/**
 * 搜尋網路設備
 */
export const searchNetworkEquipment = async (query) => {
    try {
        if (!query || query.trim() === '') {
            return await getAllNetworkEquipment();
        }

        const q = `%${query}%`;
        const { data, error } = await supabase
            .from('network_equipment')
            .select('*')
            .or(`brand.ilike.${q},model.ilike.${q},ip_address.ilike.${q},location.ilike.${q},notes.ilike.${q},notes_ii.ilike.${q},asset_id.ilike.${q}`)
            .order('id', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error searching network equipment:', error);
        return { data: null, error };
    }
};
