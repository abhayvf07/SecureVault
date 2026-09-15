import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * ContextMenu
 * A Drive-style floating context menu with click-based sub-menu support.
 * Repositions automatically if near viewport edges.
 *
 * BUG FIX: Both the main menu and submenu share a single container ref
 * so that clicking submenu items isn't treated as an "outside click".
 */
const ContextMenu = ({ position, items, onClose }) => {
  const containerRef = useRef(null);
  const menuRef = useRef(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [submenuPosition, setSubmenuPosition] = useState({ x: 0, y: 0 });

  // Adjust position to keep menu within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let x = position.x;
      let y = position.y;

      if (x + rect.width > vw - 8) x = vw - rect.width - 8;
      if (y + rect.height > vh - 8) y = vh - rect.height - 8;
      x = Math.max(8, x);
      y = Math.max(8, y);

      setAdjustedPosition({ x, y });
    }
  }, [position]);

  // Close on click outside (checks the entire container including submenus) or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Check if click is inside the container (which holds both menu + submenu)
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (activeSubmenu !== null) {
          setActiveSubmenu(null);
        } else {
          onClose();
        }
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, activeSubmenu]);

  // Toggle submenu on click
  const handleSubmenuClick = useCallback((index, e) => {
    e.stopPropagation();
    if (activeSubmenu === index) {
      setActiveSubmenu(null);
      return;
    }
    const itemRect = e.currentTarget.getBoundingClientRect();
    setSubmenuPosition({
      x: itemRect.right + 2,
      y: itemRect.top,
    });
    setActiveSubmenu(index);
  }, [activeSubmenu]);

  return (
    // Wrapper div that contains BOTH the main menu AND any open submenu.
    // This ensures clicking a submenu item is NOT treated as an outside click.
    <div ref={containerRef}>
      <div
        ref={menuRef}
        className="fixed z-[100] min-w-[200px] py-1.5 glass-card shadow-2xl shadow-black/40 animate-scale-in"
        style={{
          left: adjustedPosition.x,
          top: adjustedPosition.y,
          transformOrigin: 'top left',
        }}
      >
        {items.map((item, index) => {
          if (item.divider) {
            return <div key={index} className="border-t border-dark-700/50 my-1" />;
          }

          const hasSubmenu = item.submenu && item.submenu.length > 0;
          const isSubmenuOpen = activeSubmenu === index;
          const Icon = item.icon;

          return (
            <div key={index} className="relative">
              <button
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-all duration-150
                  ${item.danger
                    ? 'text-red-400 hover:bg-red-500/10'
                    : isSubmenuOpen
                      ? 'bg-dark-700/60 text-dark-100'
                      : 'text-dark-200 hover:bg-dark-700/60 hover:text-dark-100'
                  }
                  ${item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                `}
                onClick={(e) => {
                  if (item.disabled) return;
                  if (hasSubmenu) {
                    handleSubmenuClick(index, e);
                  } else if (item.onClick) {
                    item.onClick();
                    onClose();
                  }
                }}
                disabled={item.disabled}
              >
                {Icon && <Icon className="w-4 h-4 shrink-0" />}
                <span className="flex-1 text-left">{item.label}</span>
                {hasSubmenu && (
                  <ChevronRight className={`w-3.5 h-3.5 text-dark-500 transition-transform duration-150 ${
                    isSubmenuOpen ? 'rotate-90 text-primary-400' : ''
                  }`} />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Submenu — rendered inside the same containerRef so clicks aren't "outside" */}
      {activeSubmenu !== null && items[activeSubmenu]?.submenu && (
        <SubmenuPanel
          items={items[activeSubmenu].submenu}
          position={submenuPosition}
          onClose={onClose}
        />
      )}
    </div>
  );
};

/**
 * SubmenuPanel — secondary floating menu for Move to.../Copy to... folder lists
 */
const SubmenuPanel = ({ items, position, onClose }) => {
  const ref = useRef(null);
  const [adjusted, setAdjusted] = useState(position);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let x = position.x;
      let y = position.y;

      // Flip left if would overflow right
      if (x + rect.width > vw - 8) {
        x = position.x - rect.width - 210;
        x = Math.max(8, x);
      }
      if (y + rect.height > vh - 8) {
        y = vh - rect.height - 8;
      }
      y = Math.max(8, y);

      setAdjusted({ x, y });
    }
  }, [position]);

  return (
    <div
      ref={ref}
      className="fixed z-[101] min-w-[180px] max-h-[280px] overflow-y-auto py-1.5 glass-card shadow-2xl shadow-black/40 animate-fade-in"
      style={{ left: adjusted.x, top: adjusted.y }}
    >
      {items.map((item, index) => {
        if (item.divider) {
          return <div key={index} className="border-t border-dark-700/50 my-1" />;
        }

        const Icon = item.icon;

        return (
          <button
            key={index}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-all duration-150 cursor-pointer
              ${item.active
                ? 'text-primary-400 bg-primary-500/10'
                : 'text-dark-200 hover:bg-dark-700/60 hover:text-dark-100'
              }
            `}
            onClick={() => {
              item.onClick?.();
              onClose();
            }}
          >
            {Icon && <Icon className="w-4 h-4 shrink-0" />}
            <span className="flex-1 text-left truncate">{item.label}</span>
            {item.active && (
              <span className="text-xs text-primary-500">Current</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ContextMenu;
