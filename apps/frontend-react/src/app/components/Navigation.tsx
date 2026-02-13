import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Navigation: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    // Toggle menu
    const toggleMenu = () => setIsOpen(!isOpen);

    // Close menu when clicking outside or navigating
    const closeMenu = () => setIsOpen(false);

    // Styling
    const styles = {
        hamburger: {
            position: 'fixed' as const,
            top: '20px',
            left: '20px',
            zIndex: 2000,
            cursor: 'pointer',
            padding: '7px',
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: '5px',
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '3px',
        },
        bar: {
            width: '18px',
            height: '2px',
            backgroundColor: 'white',
            borderRadius: '2px',
            transition: 'all 0.3s ease',
        },
        drawer: {
            position: 'fixed' as const,
            top: 0,
            left: isOpen ? 0 : '-250px',
            width: '250px',
            height: '100%',
            backgroundColor: '#1a1a1a',
            boxShadow: '2px 0 5px rgba(0,0,0,0.5)',
            transition: 'left 0.3s ease',
            zIndex: 1999,
            paddingTop: '80px',
            display: 'flex',
            flexDirection: 'column' as const,
        },
        overlay: {
            position: 'fixed' as const,
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1998,
            display: isOpen ? 'block' : 'none',
        },
        menuItem: {
            padding: '15px 25px',
            color: 'white',
            textDecoration: 'none',
            fontSize: '18px',
            borderBottom: '1px solid #333',
            transition: 'background 0.2s',
            display: 'block',
        },
        activeItem: {
            backgroundColor: '#333',
            color: '#FFD700',
            fontWeight: 'bold',
        }
    };

    return (
        <>
            {/* Hamburger Button */}
            <div style={styles.hamburger} onClick={toggleMenu}>
                <div style={{ ...styles.bar, transform: isOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }}></div>
                <div style={{ ...styles.bar, opacity: isOpen ? 0 : 1 }}></div>
                <div style={{ ...styles.bar, transform: isOpen ? 'rotate(-45deg) translate(7px, -6px)' : 'none' }}></div>
            </div>

            {/* Overlay (Click to close) */}
            <div style={styles.overlay} onClick={closeMenu}></div>

            {/* Drawer Menu */}
            <div style={styles.drawer}>
                <div style={{ padding: '0 25px 20px', borderBottom: '1px solid #444', marginBottom: '10px' }}>
                    <h2 style={{ color: '#FFD700', margin: 0 }}>Menu</h2>
                </div>

                <Link 
                    to="/" 
                    style={{ ...styles.menuItem, ...(location.pathname === '/' ? styles.activeItem : {}) }}
                    onClick={closeMenu}
                >
                    🏠 Trang chủ
                </Link>

                <Link 
                    to="/dua-ngua" 
                    style={{ ...styles.menuItem, ...(location.pathname.startsWith('/dua-ngua') ? styles.activeItem : {}) }}
                    onClick={closeMenu}
                >
                    🏇 Đua Ngựa
                </Link>

                <Link 
                    to="/rung-hoa" 
                    style={{ ...styles.menuItem, ...(location.pathname.startsWith('/rung-hoa') ? styles.activeItem : {}) }}
                    onClick={closeMenu}
                >
                    🌸 Rung Hoa
                </Link>
            </div>
        </>
    );
};
