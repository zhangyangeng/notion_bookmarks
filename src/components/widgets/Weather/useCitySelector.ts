import { useState, useRef, useEffect, RefObject, useCallback } from 'react';

interface UseCitySelectorProps {
    onClose?: () => void;
}

interface UseCitySelectorReturn {
    show: boolean;
    toggle: (e?: React.MouseEvent) => void;
    close: () => void;
    open: () => void;
    menuRef: RefObject<HTMLDivElement | null>;
    buttonRef: RefObject<HTMLButtonElement | null>;
}

export function useCitySelector({ onClose }: UseCitySelectorProps = {}): UseCitySelectorReturn {
    const [show, setShow] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const toggle = useCallback((e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setShow((prev) => !prev);
    }, []);

    const close = useCallback(() => {
        setShow(false);
        if (onClose) onClose();
    }, [onClose]);

    const open = useCallback(() => {
        setShow(true);
    }, []);

    // Click outside listener
    useEffect(() => {
        if (!show) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                close();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [show, onClose, close]);

    return {
        show,
        toggle,
        close,
        open,
        menuRef,
        buttonRef
    };
}
