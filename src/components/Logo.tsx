interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export default function Logo({ size = 'md', showText = true }: LogoProps) {
  const imgSizes = { sm: 28, md: 38, lg: 56 };
  const px = imgSizes[size];
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/images/17f13e3b-0748-4057-8175-6ae9ca15047e.jpg"
        alt="MZ Logo"
        style={{ width: px, height: px, borderRadius: 8, objectFit: 'cover' }}
      />
      {showText && (
        <div>
          <div style={{ fontSize: size === 'sm' ? 13 : size === 'md' ? 15 : 20, fontWeight: 700, color: '#f97316', lineHeight: 1 }}>
            MZ Survey
          </div>
          <div style={{ fontSize: size === 'sm' ? 9 : 10, color: '#d4952b', fontWeight: 500, marginTop: 2 }}>
            مكتب المساحة المتنقل
          </div>
        </div>
      )}
    </div>
  );
}
