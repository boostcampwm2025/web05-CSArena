import { useState } from 'react';
import { Category } from '@/shared/type';

interface CategoryFilterModalProps {
  categories: Category[];
  selectedCategoryIds: number[];
  onApply: (categoryIds: number[]) => void;
  onClose: () => void;
}

export default function CategoryFilterModal({
  categories,
  selectedCategoryIds,
  onApply,
  onClose,
}: CategoryFilterModalProps) {
  const [tempSelected, setTempSelected] = useState<number[]>(selectedCategoryIds);
  const [expandedParent, setExpandedParent] = useState<number | null>(null);

  // 대분류 카테고리만 추출
  const parentCategories = categories.filter((cat) => cat.parentId === null);

  const handleToggle = (categoryId: number) => {
    if (tempSelected.includes(categoryId)) {
      setTempSelected(tempSelected.filter((id) => id !== categoryId));
    } else {
      setTempSelected([...tempSelected, categoryId]);
    }
  };

  const handleParentClick = (parentId: number) => {
    if (expandedParent === parentId) {
      setExpandedParent(null);
    } else {
      setExpandedParent(parentId);
    }
  };

  const handleApply = () => {
    onApply(tempSelected);
    onClose();
  };

  const handleReset = () => {
    setTempSelected([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-3xl overflow-y-auto rounded-lg border-2 border-cyan-400 bg-slate-900/95 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-cyan-400 p-4">
          <h2 className="text-lg font-bold text-cyan-400" style={{ fontFamily: 'Orbitron' }}>
            🏷️ CATEGORY FILTER
          </h2>
          <button
            onClick={onClose}
            className="text-2xl text-cyan-400 transition-colors hover:text-cyan-300"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] space-y-2 overflow-y-auto p-6">
          {parentCategories.map((parent) => {
            const childCategories = categories.filter((cat) => cat.parentId === parent.id);
            const isExpanded = expandedParent === parent.id;
            const isSelected = tempSelected.includes(parent.id);

            return (
              <div key={parent.id} className="space-y-2">
                {/* 대분류 */}
                <div
                  className={`flex cursor-pointer items-center justify-between rounded border-2 p-3 transition-colors ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-400/20 hover:bg-cyan-400/30'
                      : 'border-purple-400 bg-slate-800/50 hover:bg-slate-800/70'
                  }`}
                  onClick={() => handleParentClick(parent.id)}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(parent.id);
                      }}
                      className="flex h-5 w-5 items-center justify-center"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggle(parent.id)}
                        className="h-5 w-5 cursor-pointer accent-cyan-400"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </button>
                    <span
                      className={`text-base font-bold ${isSelected ? 'text-cyan-400' : 'text-purple-400'}`}
                      style={{ fontFamily: 'Orbitron' }}
                    >
                      {parent.name.toUpperCase()}
                    </span>
                  </div>
                  {childCategories.length > 0 && (
                    <span
                      className={`text-sm transition-transform ${isExpanded ? 'rotate-180' : ''} ${isSelected ? 'text-cyan-400' : 'text-purple-400'}`}
                    >
                      ▼
                    </span>
                  )}
                </div>

                {/* 소분류 - 펼쳐진 경우만 표시 */}
                {isExpanded && childCategories.length > 0 && (
                  <div className="ml-8 grid grid-cols-2 gap-2">
                    {childCategories.map((child) => {
                      const isChildSelected = tempSelected.includes(child.id);

                      return (
                        <label
                          key={child.id}
                          className={`flex cursor-pointer items-center gap-2 rounded border p-2 transition-colors ${
                            isChildSelected
                              ? 'border-cyan-400 bg-cyan-400/20 hover:bg-cyan-400/30'
                              : 'border-cyan-400/30 bg-slate-800/30 hover:bg-slate-800/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChildSelected}
                            onChange={() => handleToggle(child.id)}
                            className="h-4 w-4 cursor-pointer accent-cyan-400"
                          />
                          <span
                            className={`text-sm ${isChildSelected ? 'text-cyan-400' : 'text-cyan-400/70'}`}
                            style={{ fontFamily: 'Orbitron' }}
                          >
                            {child.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t-2 border-cyan-400 p-4">
          <button
            onClick={handleReset}
            className="flex-1 rounded border-2 border-purple-400 bg-transparent py-2 text-sm font-bold text-purple-400 transition-colors hover:bg-purple-400/20"
            style={{ fontFamily: 'Orbitron' }}
          >
            RESET
          </button>
          <button
            onClick={handleApply}
            className="flex-1 rounded border-2 border-cyan-400 bg-cyan-400/20 py-2 text-sm font-bold text-cyan-400 transition-colors hover:bg-cyan-400/30"
            style={{ fontFamily: 'Orbitron' }}
          >
            APPLY ({tempSelected.length})
          </button>
        </div>
      </div>
    </div>
  );
}
