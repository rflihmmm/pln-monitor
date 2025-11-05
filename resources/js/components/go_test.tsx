import React, { useState, useEffect } from 'react';

const GoTest: React.FC = () => {
    const [status, setStatus] = useState<string>('loading...');

    useEffect(() => {
        const fetchHealth = async () => {
            try {
                const token = localStorage.getItem('jwt_token');
                const response = await fetch('http://localhost:8080/', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (response.ok) {
                    const data = await response.json();
                    setStatus(data.status);
                } else {
                    setStatus(`error ${response.status}`);
                }
            } catch (error) {
                setStatus('error');
            }
        };

        fetchHealth();
    }, []);

    return (
        <div>
            <h2>Go Backend Health Check</h2>
            <p>Status: {status}</p>
        </div>
    );
};

export default GoTest;
