import React, { useState } from 'react';
import './Login.css';
import { signIn } from '../services/authService';

function Login({ onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { data, error } = await signIn(email, password);

        if (error) {
            setError(error.message || '登入失敗,請檢查您的帳號密碼');
            setLoading(false);
        } else {
            // 登入成功
            if (onLoginSuccess) {
                onLoginSuccess(data.user);
            }
        }
    };

    return (
        <div className="login-container">
            <div className="login-background">
                <div className="login-card">
                    <div className="login-header">
                        <div className="login-icon">🖥️</div>
                        <h1> Stork 資訊管理系統</h1>
                        <p className="login-subtitle">請登入以繼續</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        {error && (
                            <div className="login-error">
                                <span>⚠️ {error}</span>
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="email">電子郵件</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="example@email.com"
                                required
                                autoFocus
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">密碼</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="請輸入密碼"
                                required
                                disabled={loading}
                            />
                        </div>

                        <button
                            type="submit"
                            className="login-button"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="login-spinner"></span>
                                    登入中...
                                </>
                            ) : (
                                '登入'
                            )}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p>🔒 使用 Supabase 安全認證</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;
