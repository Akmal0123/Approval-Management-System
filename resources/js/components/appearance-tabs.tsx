import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useState } from 'react';

export default function AppearanceTabs() {
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');

    const handleThemeChange = (value: string) => {
        setTheme(value as 'light' | 'dark' | 'system');
        // Here you would typically save the theme preference
        // For now, we'll just update the state
        if (value === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    return (
        <Tabs defaultValue="theme" className="w-full">
            <TabsList>
                <TabsTrigger value="theme">Theme</TabsTrigger>
                <TabsTrigger value="display">Display</TabsTrigger>
            </TabsList>
            <TabsContent value="theme" className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Theme</CardTitle>
                        <CardDescription>Select the theme for the application</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <RadioGroup value={theme} onValueChange={handleThemeChange}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="light" id="light" />
                                <Label htmlFor="light" className="flex items-center gap-2 font-normal">
                                    <Sun className="h-4 w-4" />
                                    Light
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="dark" id="dark" />
                                <Label htmlFor="dark" className="flex items-center gap-2 font-normal">
                                    <Moon className="h-4 w-4" />
                                    Dark
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="system" id="system" />
                                <Label htmlFor="system" className="flex items-center gap-2 font-normal">
                                    <Monitor className="h-4 w-4" />
                                    System
                                </Label>
                            </div>
                        </RadioGroup>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="display" className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Display Settings</CardTitle>
                        <CardDescription>Customize how content is displayed</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Display settings will be available soon.</p>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}
