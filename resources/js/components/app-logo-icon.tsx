import { FileText } from 'lucide-react';

interface AppLogoIconProps {
    className?: string;
}

export default function AppLogoIcon({ className }: AppLogoIconProps) {
    return <FileText className={className} />;
}
