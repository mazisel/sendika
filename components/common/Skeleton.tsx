
import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'rectangular' | 'circular' | 'text';
    width?: string | number;
    height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    variant = 'rectangular',
    width,
    height
}) => {
    const baseClasses = "animate-pulse bg-slate-200 dark:bg-slate-700 rounded";
    const variantClasses = {
        rectangular: "rounded-lg",
        circular: "rounded-full",
        text: "rounded h-4 w-full"
    };

    const style = {
        width: width,
        height: height
    };

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            style={style}
        />
    );
};

export const CardSkeleton = () => (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
        <div className="flex items-center justify-between mb-2">
            <div className="space-y-2">
                <Skeleton variant="text" width={100} />
                <Skeleton variant="text" width={60} height={32} />
            </div>
            <Skeleton variant="circular" width={48} height={48} />
        </div>
    </div>
);

export const ChartSkeleton = () => (
    <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm h-[300px] flex items-center justify-center">
        <div className="flex items-end space-x-4 h-40">
            <Skeleton width={30} height="40%" />
            <Skeleton width={30} height="70%" />
            <Skeleton width={30} height="50%" />
            <Skeleton width={30} height="80%" />
            <Skeleton width={30} height="60%" />
        </div>
    </div>
);

export const TableRowSkeleton = () => (
    <div className="flex items-center space-x-4 p-4 border-b border-gray-100 dark:border-slate-800">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="30%" />
            <Skeleton variant="text" width="20%" />
        </div>
        <Skeleton width={80} height={32} />
    </div>
);
