export default function SketchyFlag({ code, className = '' }) {
    // Common scribbles
    const scribbleVertical = (color, offset) => (
        <path
            d={`M${offset} 5 L${offset + 2} 95 L${offset + 4} 5 L${offset + 6} 95 L${offset + 8} 5 L${offset + 10} 95 L${offset + 12} 5 L${offset + 14} 95 L${offset + 16} 5 L${offset + 18} 95 L${offset + 20} 5 L${offset + 22} 95 L${offset + 24} 5 L${offset + 26} 95 L${offset + 28} 5 L${offset + 30} 95 L${offset + 32} 5 L${offset + 33} 95`}
            stroke={color}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    )

    const scribbleHorizontal = (color, yOffset, strokeWidth = '30') => (
        <path
            d={`M5 ${yOffset} C 20 ${yOffset - 2}, 40 ${yOffset + 2}, 95 ${yOffset}`}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            style={{ filter: 'url(#roughness)' }}
        />
    )

    // Custom filter for rough edges
    const defs = (
        <defs>
            <filter id="scribble-roughness">
                <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" />
            </filter>
        </defs>
    )

    // Color Bleed & Messy Path Logic
    // We use slightly larger/irregular paths for "fill" layers to simulate crayon going outside lines.

    const renderFlag = () => {
        switch (code) {
            case 'it': // Italy (Green, White, Red)
                return (
                    <g filter="url(#scribble-roughness)">
                        {/* Green: Bleeds left and top/bottom */}
                        <path d="M0 0 L22 1 L21 39 L-2 40 Z" fill="#009246" stroke="none" opacity="0.9" />
                        {/* White: Center */}
                        <path d="M20 1 L42 0 L41 40 L19 39 Z" fill="#F1F2F1" stroke="none" />
                        {/* Red: Bleeds right */}
                        <path d="M40 0 L60 -1 L62 41 L39 39 Z" fill="#CE2B37" stroke="none" opacity="0.9" />

                        {/* Sketchy Pencil Outline - Looser */}
                        <path d="M20 1 L20 39 M40 1 L40 39" stroke="#333" strokeWidth="0.5" fill="none" opacity="0.3" />
                    </g>
                )
            case 'fr': // France
                return (
                    <g filter="url(#scribble-roughness)">
                        <path d="M0 1 L22 -1 L21 41 L-1 39 Z" fill="#002395" stroke="none" opacity="0.9" />
                        <path d="M20 0 L42 2 L41 38 L19 40 Z" fill="#FFFFFF" stroke="none" />
                        <path d="M40 1 L62 0 L61 41 L39 39 Z" fill="#ED2939" stroke="none" opacity="0.9" />
                    </g>
                )
            case 'es': // Spain
                return (
                    <g filter="url(#scribble-roughness)">
                        {/* Red Top - Bleed Top */}
                        <path d="M-1 -1 L61 0 L60 11 L0 9 Z" fill="#AA151B" opacity="0.9" />
                        {/* Yellow Middle - Bleed Sides */}
                        <path d="M-2 9 L62 9 L61 31 L-1 31 Z" fill="#F1BF00" />
                        {/* Red Bottom - Bleed Bottom */}
                        <path d="M0 31 L60 31 L61 42 L-1 40 Z" fill="#AA151B" opacity="0.9" />

                        {/* Messy Crest */}
                        <path d="M15 15 C 20 12, 25 18, 20 25 C 15 22, 12 18, 15 15" fill="#AA151B" opacity="0.6" />
                    </g>
                )
            case 'ko': // South Korea (Taegeukgi)
                return (
                    <g filter="url(#scribble-roughness)">
                        {/* White BG */}
                        <path d="M0 0 L60 -1 L61 41 L-1 40 Z" fill="white" />

                        {/* Taegeuk (Red/Blue Circle) */}
                        {/* Red Top */}
                        <path d="M30 20 C 35 15, 30 10, 40 10 A 10 10 0 0 1 30 30 C 25 25, 30 20, 20 20 A 10 10 0 0 1 30 10 Z"
                            fill="#CD2E3A" opacity="0.9" style={{ transform: 'translate(10px, 0)' }} />
                        {/* Simplified Circle Path for the center */}
                        <circle cx="30" cy="20" r="10" fill="#CD2E3A" clipPath="url(#topHalf)" />
                        <circle cx="30" cy="20" r="10" fill="#0047A0" clipPath="url(#bottomHalf)" />
                        {/* Manual Path for "Yin Yang" swirl effect */}
                        <path d="M30 20 A 5 5 0 0 1 40 20 A 5 5 0 0 0 20 20 A 5 5 0 0 1 30 20" fill="#CD2E3A" />

                        {/* Better Sketchy Implementation */}
                        {/* White Background */}
                        <rect x="0" y="0" width="60" height="40" fill="white" />

                        {/* Red Top Semicircle + Wave */}
                        <path d="M18 20 Q 24 14, 30 20 T 42 20 A 12 12 0 0 0 18 20" fill="#CD2E3A" opacity="0.9" />

                        {/* Blue Bottom Semicircle + Wave */}
                        <path d="M18 20 Q 24 26, 30 20 T 42 20 A 12 12 0 0 1 18 20" fill="#0047A0" opacity="0.9" />

                        {/* Trigrams (Black Lines) - Simplified as 3 distinct scratch groups */}
                        {/* Top Left (3 solid) */}
                        <path d="M5 5 L15 5 M5 8 L15 8 M5 11 L15 11" stroke="black" strokeWidth="1.5" transform="rotate(35 10 8)" />
                        {/* Bottom Right (3 broken - simplified to solid for scale) */}
                        <path d="M45 35 L55 35 M45 32 L55 32 M45 29 L55 29" stroke="black" strokeWidth="1.5" transform="rotate(35 50 32)" />
                        {/* Top Right (Broken/Solid mix - simplified) */}
                        <path d="M45 5 L55 5 M45 8 L55 8 M45 11 L55 11" stroke="black" strokeWidth="1.5" transform="rotate(-35 50 8)" />
                        {/* Bottom Left (Solid/Broken mix - simplified) */}
                        <path d="M5 35 L15 35 M5 32 L15 32 M5 29 L15 29" stroke="black" strokeWidth="1.5" transform="rotate(-35 10 32)" />
                    </g>
                )
            case 'en': // UK (Union Jack) - Reverted to cleaner style per request
                return (
                    <g filter="url(#scribble-roughness)">
                        <rect x="0" y="0" width="60" height="40" fill="#012169" />
                        {/* White Diagonals */}
                        <path d="M0 0 L60 40 M60 0 L0 40" stroke="white" strokeWidth="6" />
                        {/* Red Diagonals */}
                        <path d="M0 0 L60 40 M60 0 L0 40" stroke="#C8102E" strokeWidth="2" />
                        {/* White Cross */}
                        <path d="M30 0 L30 40 M0 20 L60 20" stroke="white" strokeWidth="8" />
                        {/* Red Cross */}
                        <path d="M30 0 L30 40 M0 20 L60 20" stroke="#C8102E" strokeWidth="4" />
                    </g>
                )
            default:
                return null
        }
    }

    return (
        <svg
            viewBox="-5 -5 70 50" // Expanded viewbox to allow bleed
            className={`sketchy-flag ${className}`}
            overflow="visible"
            style={{ width: '100%', height: '100%' }}
        >
            {defs}
            {renderFlag()}

            {/* Outline Frame - Very Loose scribbles */}
            <path
                d="M0 0 C 10 -2, 20 2, 30 0 C 40 -1, 50 1, 60 0 C 62 10, 58 20, 60 30 C 61 35, 59 40, 60 40 C 50 42, 40 39, 30 40 C 20 41, 10 39, 0 40 C -2 30, 2 20, 0 10 C -1 5, 1 0, 0 0"
                fill="none"
                stroke="#333"
                strokeWidth="0.8"
                strokeLinecap="round"
                opacity="0.5"
                filter="url(#scribble-roughness)"
            />
        </svg>
    )
}
