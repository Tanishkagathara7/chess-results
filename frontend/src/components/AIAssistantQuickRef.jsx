import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

const AIAssistantQuickRef = () => {
    const [isExpanded, setIsExpanded] = useState(false);

    const examples = [
        {
            category: '🏆 Tournaments',
            commands: [
                'create tournament Spring Open at Boston from 2024-04-01 to 2024-04-03 with 5 rounds',
                'list all tournaments',
                'start tournament Spring Open'
            ]
        },
        {
            category: '👤 Players',
            commands: [
                'add player John Doe with rating 1800',
                'get player John Doe',
                'list all players'
            ]
        },
        {
            category: '🎯 Registration',
            commands: [
                'add John Doe to Spring Open',
                'register Alice Smith for Summer Cup'
            ]
        },
        {
            category: '🔄 Navigation',
            commands: [
                'go to tournaments',
                'open players',
                'show requests',
                'refresh data'
            ]
        }
    ];

    return (
        <Card className="mb-4 border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-sm font-medium text-blue-900">
                            Quick Reference
                        </CardTitle>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="h-8 w-8 p-0"
                    >
                        {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </CardHeader>
            {isExpanded && (
                <CardContent className="pt-0">
                    <div className="space-y-3">
                        {examples.map((section, idx) => (
                            <div key={idx}>
                                <h4 className="text-xs font-semibold text-blue-800 mb-1">
                                    {section.category}
                                </h4>
                                <ul className="space-y-1">
                                    {section.commands.map((cmd, cmdIdx) => (
                                        <li
                                            key={cmdIdx}
                                            className="text-xs text-gray-700 bg-white px-2 py-1 rounded border border-gray-200 font-mono"
                                        >
                                            {cmd}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                        <div className="pt-2 border-t border-blue-200">
                            <p className="text-xs text-blue-700">
                                💡 <strong>Tip:</strong> Commands are flexible! Try natural variations like "make tournament" or "show players"
                            </p>
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    );
};

export default AIAssistantQuickRef;
