import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Milenote',
        short_name: 'Milenote',
        description: '愛車管理・維持費記録アプリ',
        start_url: '/',
        display: 'standalone',
        background_color: '#f2f2f2',
        theme_color: '#f2f2f2',
        icons: [
            {
                src: '/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    }
}