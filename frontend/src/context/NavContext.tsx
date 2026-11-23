import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

interface NavContextType {
  isPinned: boolean;
  togglePin: () => void;
  isVisible: boolean;
  setIsVisible: (val: boolean) => void;
  isHovered: boolean;
  setIsHovered: (val: boolean) => void;
  isFocused: boolean;
  setIsFocused: (val: boolean) => void;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (val: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (val: boolean) => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  reportInteraction: () => void;
}

const NavContext = createContext<NavContextType | undefined>(undefined);

export const NavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    return localStorage.getItem('classsphere_nav_pinned') === 'true';
  });

  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('mobileMenu') === 'open';
    } catch {
      return false;
    }
  });

  const inactivityTimerRef = useRef<number | null>(null);

  const togglePin = useCallback(() => {
    setIsPinned((prev) => {
      const next = !prev;
      localStorage.setItem('classsphere_nav_pinned', String(next));
      if (next) {
        setIsVisible(true);
      }
      return next;
    });
  }, []);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const reportInteraction = useCallback(() => {
    setIsVisible(true);
    clearInactivityTimer();

    // If pinned, hovered, focused, or dropdown open, do not schedule auto-hide
    if (isPinned || isHovered || isFocused || isDropdownOpen) {
      return;
    }

    inactivityTimerRef.current = window.setTimeout(() => {
      if (!isPinned && !isHovered && !isFocused && !isDropdownOpen) {
        setIsVisible(false);
      }
    }, 2800);
  }, [isPinned, isHovered, isFocused, isDropdownOpen, clearInactivityTimer]);

  // Keep visible whenever conditions require it
  useEffect(() => {
    if (isPinned || isHovered || isFocused || isDropdownOpen) {
      setIsVisible(true);
      clearInactivityTimer();
    } else {
      reportInteraction();
    }
  }, [isPinned, isHovered, isFocused, isDropdownOpen, clearInactivityTimer, reportInteraction]);

  // Global mousemove & keyboard listener for interaction detection & Alt+N shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + N shortcut to toggle navigation
      if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setIsVisible((prev) => !prev);
      }

      // Escape closes mobile menu or open dropdown
      if (e.key === 'Escape') {
        if (isMobileMenuOpen) {
          setIsMobileMenuOpen(false);
        }
        if (isDropdownOpen) {
          setIsDropdownOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearInactivityTimer();
    };
  }, [isMobileMenuOpen, isDropdownOpen, clearInactivityTimer]);

  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <NavContext.Provider
      value={{
        isPinned,
        togglePin,
        isVisible,
        setIsVisible,
        isHovered,
        setIsHovered,
        isFocused,
        setIsFocused,
        isDropdownOpen,
        setIsDropdownOpen,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        toggleMobileMenu,
        closeMobileMenu,
        reportInteraction,
      }}
    >
      {children}
    </NavContext.Provider>
  );
};

export const useNav = (): NavContextType => {
  const context = useContext(NavContext);
  if (!context) {
    throw new Error('useNav must be used within a NavProvider');
  }
  return context;
};
