import React, { useState, useEffect } from 'react';
import { Modal, Slider, Button, Tooltip } from 'antd';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  CompressOutlined,
  ExpandOutlined,
  ReloadOutlined,
  BgColorsOutlined,
} from '@ant-design/icons';

interface LogoCropModalProps {
  open: boolean;
  imageSrc: string | null;
  onCancel: () => void;
  onApply: (croppedFile: File, previewUrl: string) => void;
}

export const LogoCropModal: React.FC<LogoCropModalProps> = ({
  open,
  imageSrc,
  onCancel,
  onApply,
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [bgMode, setBgMode] = useState<'white' | 'checkerboard' | 'dark'>('white');

  const containerSize = 260; // size of square viewport in px
  const circleRadius = 90; // 180px diameter circle

  // Load image when src changes
  useEffect(() => {
    if (open && imageSrc) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setImgElement(img);
        const naturalW = img.naturalWidth || img.width;
        const naturalH = img.naturalHeight || img.height;
        const maxDimension = Math.max(naturalW, naturalH);
        const autoFitScale = (circleRadius * 2 * 0.85) / maxDimension;
        setScale(Number(autoFitScale.toFixed(3)));
        setPosition({ x: 0, y: 0 });
      };
      img.src = imageSrc;
    }
  }, [open, imageSrc]);

  const handleFitContain = () => {
    if (!imgElement) return;
    const naturalW = imgElement.naturalWidth || imgElement.width;
    const naturalH = imgElement.naturalHeight || imgElement.height;
    const maxDimension = Math.max(naturalW, naturalH);
    const fitScale = (circleRadius * 2 * 0.85) / maxDimension;
    setScale(Number(fitScale.toFixed(3)));
    setPosition({ x: 0, y: 0 });
  };

  const handleFitCover = () => {
    if (!imgElement) return;
    const naturalW = imgElement.naturalWidth || imgElement.width;
    const naturalH = imgElement.naturalHeight || imgElement.height;
    const minDimension = Math.min(naturalW, naturalH);
    const coverScale = (circleRadius * 2) / minDimension;
    setScale(Number(coverScale.toFixed(3)));
    setPosition({ x: 0, y: 0 });
  };

  const handleReset = () => {
    handleFitContain();
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(0.05, Number((prev - 0.05).toFixed(3))));
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(5.0, Number((prev + 0.05).toFixed(3))));
  };

  const cycleBgMode = () => {
    setBgMode((prev) => {
      if (prev === 'white') return 'checkerboard';
      if (prev === 'checkerboard') return 'dark';
      return 'white';
    });
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch drag handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  // Mouse wheel zoom handler
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setScale((prev) => {
      const nextScale = prev * zoomFactor;
      return Number(Math.min(5.0, Math.max(0.02, nextScale)).toFixed(3));
    });
  };

  // Generate cropped output canvas with 1:1 pixel matching to modal view
  const handleSave = () => {
    if (!imgElement) return;
    setLoading(true);

    try {
      const canvas = document.createElement('canvas');
      const outputSize = 300; // Output high resolution 300x300 PNG
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        setLoading(false);
        return;
      }

      // Fill solid white background so logos render crisp without dark transparency issues
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, outputSize, outputSize);

      const naturalW = imgElement.naturalWidth || imgElement.width;
      const naturalH = imgElement.naturalHeight || imgElement.height;

      // Ratio from 180px circle in modal to 300px canvas
      const ratio = outputSize / (circleRadius * 2);

      const drawnWidth = naturalW * scale * ratio;
      const drawnHeight = naturalH * scale * ratio;
      const centerX = outputSize / 2 + position.x * ratio;
      const centerY = outputSize / 2 + position.y * ratio;

      ctx.drawImage(
        imgElement,
        centerX - drawnWidth / 2,
        centerY - drawnHeight / 2,
        drawnWidth,
        drawnHeight
      );

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], 'company_logo.png', { type: 'image/png' });
            const dataUrl = canvas.toDataURL('image/png');
            onApply(file, dataUrl);
          }
          setLoading(false);
        },
        'image/png',
        1.0
      );
    } catch {
      setLoading(false);
    }
  };

  const getBgStyle = () => {
    if (bgMode === 'dark') return { backgroundColor: '#111827' };
    if (bgMode === 'checkerboard')
      return {
        backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px), radial-gradient(#CBD5E1 1px, #F8FAFC 1px)`,
        backgroundSize: '16px 16px',
        backgroundPosition: '0 0, 8px 8px',
      };
    return { backgroundColor: '#FFFFFF' };
  };

  const naturalW = imgElement?.naturalWidth || imgElement?.width || 1;
  const naturalH = imgElement?.naturalHeight || imgElement?.height || 1;

  return (
    <Modal
      title="Adjust Company Logo"
      open={open}
      onCancel={onCancel}
      onOk={handleSave}
      okText="Apply & Save"
      confirmLoading={loading}
      width={380}
      centered
      destroyOnClose
    >
      <div className="flex flex-col items-center py-2">
        <p className="text-xs text-gray-500 mb-3 text-center">
          Drag to position logo. Scroll mouse wheel or use zoom controls to scale inside avatar.
        </p>

        {/* Viewport Box */}
        <div
          className="relative overflow-hidden rounded-2xl border-2 border-gray-200 select-none cursor-grab active:cursor-grabbing shadow-inner flex items-center justify-center transition-colors"
          style={{ width: containerSize, height: containerSize, ...getBgStyle() }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* Image rendered inside viewport with 1:1 absolute center positioning */}
          {imgElement && (
            <img
              src={imageSrc || ''}
              alt="Logo Preview"
              draggable={false}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: `${naturalW}px`,
                height: `${naturalH}px`,
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${scale})`,
                transformOrigin: 'center center',
                maxHeight: 'none',
                maxWidth: 'none',
                pointerEvents: 'none',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              }}
            />
          )}

          {/* Mask Overlay: Light frosted white outside the circle */}
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{
              background: `radial-gradient(circle ${circleRadius}px at center, transparent 99%, rgba(241, 245, 249, 0.88) 100%)`,
              boxShadow: `inset 0 0 0 2px rgba(226, 232, 240, 0.8)`,
            }}
          />

          {/* Circular border guideline */}
          <div
            className="absolute rounded-full border-2 border-blue-500 pointer-events-none shadow-sm ring-4 ring-blue-100"
            style={{ width: circleRadius * 2, height: circleRadius * 2 }}
          />

          {/* Background Toggle Button */}
          <Tooltip title={`Switch Canvas Background (Current: ${bgMode})`}>
            <Button
              size="small"
              shape="circle"
              icon={<BgColorsOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                cycleBgMode();
              }}
              className="absolute top-2 right-2 z-20 bg-white/80 backdrop-blur-sm border-gray-300 shadow-sm"
            />
          </Tooltip>
        </div>

        {/* Preset Sizing Buttons */}
        <div className="flex items-center gap-2 mt-4">
          <Tooltip title="Fit entire logo inside circle">
            <Button
              size="small"
              icon={<CompressOutlined />}
              onClick={handleFitContain}
              className="text-xs"
            >
              Fit Inside
            </Button>
          </Tooltip>

          <Tooltip title="Fill entire circle">
            <Button
              size="small"
              icon={<ExpandOutlined />}
              onClick={handleFitCover}
              className="text-xs"
            >
              Fill Circle
            </Button>
          </Tooltip>

          <Tooltip title="Reset position and zoom">
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={handleReset}
              className="text-xs"
            >
              Reset
            </Button>
          </Tooltip>
        </div>

        {/* Zoom Controls: Clickable (-) and (+) Buttons with Slider */}
        <div className="w-full max-w-[280px] flex items-center gap-2 mt-4">
          <Tooltip title="Zoom Out">
            <Button
              size="small"
              shape="circle"
              icon={<ZoomOutOutlined />}
              onClick={handleZoomOut}
              disabled={scale <= 0.05}
              className="flex-shrink-0"
            />
          </Tooltip>

          <Slider
            min={0.02}
            max={2.0}
            step={0.01}
            value={scale}
            onChange={(val) => setScale(Number(val.toFixed(3)))}
            className="flex-1 my-0"
            tooltip={{ formatter: (val) => `${Math.round((val || 1) * 100)}%` }}
          />

          <Tooltip title="Zoom In">
            <Button
              size="small"
              shape="circle"
              icon={<ZoomInOutlined />}
              onClick={handleZoomIn}
              disabled={scale >= 5.0}
              className="flex-shrink-0"
            />
          </Tooltip>
        </div>
      </div>
    </Modal>
  );
};
