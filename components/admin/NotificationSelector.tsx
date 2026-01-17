import React from 'react';
import { Bell, MessageSquare, Mail } from 'lucide-react';

interface NotificationSelectorProps {
    channels: {
        push: boolean;
        sms: boolean;
        email: boolean;
    };
    onChange: (channels: { push: boolean; sms: boolean; email: boolean }) => void;
}

export default function NotificationSelector({ channels, onChange }: NotificationSelectorProps) {
    const toggleChannel = (channel: keyof typeof channels) => {
        onChange({
            ...channels,
            [channel]: !channels[channel]
        });
    };

    return (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Bildirim Seçenekleri</h4>
            <div className="flex flex-col sm:flex-row gap-4">
                <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${channels.push ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <input
                        type="checkbox"
                        checked={channels.push}
                        onChange={() => toggleChannel('push')}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <Bell className="w-4 h-4" />
                    <span className="text-sm font-medium">Mobil Bildirim</span>
                </label>

                <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${channels.sms ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <input
                        type="checkbox"
                        checked={channels.sms}
                        onChange={() => toggleChannel('sms')}
                        className="w-4 h-4 rounded text-green-600 focus:ring-green-500"
                    />
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm font-medium">SMS</span>
                </label>

                <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${channels.email ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <input
                        type="checkbox"
                        checked={channels.email}
                        onChange={() => toggleChannel('email')}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <Mail className="w-4 h-4" />
                    <span className="text-sm font-medium">E-posta</span>
                </label>
            </div>
            {(channels.push || channels.sms || channels.email) && (
                <p className="text-xs text-gray-500 mt-2">
                    * Seçilen kanallar üzerinden tüm aktif üyelere bildirim gönderilecektir.
                </p>
            )}
        </div>
    );
}
