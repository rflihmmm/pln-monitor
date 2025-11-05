import React, { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

const GoTest: React.FC = () => {
    const [status, setStatus] = useState<string>('loading...');
    const { auth } = usePage<PageProps>().props;
    const { accessToken } = auth;

    useEffect(() => {
        const fetchHealth = async () => {
            if (!accessToken) {
                setStatus('error: missing token');
                return;
            }

            try {
                const response = await fetch('http://localhost:8080/api/user', {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
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
    }, [accessToken]);

    return (
        <div>
            <h2>Go Backend Health Check</h2>
            <p>Status: {status}</p>
        </div>
    );
};

export default GoTest;
