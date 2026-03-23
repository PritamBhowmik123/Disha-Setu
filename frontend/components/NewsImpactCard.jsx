import React, { useState } from 'react';
import { View, Text, TouchableOpacity, LayoutAnimation, UIManager, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../hooks/use-color-scheme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function NewsImpactCard({ data }) {
    const { isDark } = useColorScheme();
    const [expandedIndexes, setExpandedIndexes] = useState([]);

    if (!data) return null;

    if (!data.articles || data.articles.length === 0) {
        return (
            <View className="mb-4 mx-4">
                <View className="flex-row items-center gap-2 mb-3">
                    <Ionicons name="analytics-outline" size={20} color="#8B5CF6" />
                    <Text className="text-txt font-bold text-base">Project News & Civic Insights</Text>
                </View>
                <View className="bg-card rounded-2xl border border-cardBorder p-6 items-center justify-center">
                    <Ionicons name="newspaper-outline" size={32} color={isDark ? '#374151' : '#E5E7EB'} />
                    <Text className="text-txtMuted mt-3 text-sm text-center tracking-wide font-medium">No live news articles found for this project recently.</Text>
                </View>
            </View>
        );
    }

    const { articles, insights, mainHighlight, tags } = data;

    const toggleExpand = (idx) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedIndexes(prev => 
            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
        );
    };

    return (
        <View className="mb-4">
            <View className="flex-row items-center gap-2 mb-3 mx-4">
                <Ionicons name="analytics-outline" size={20} color="#8B5CF6" />
                <Text className="text-txt font-bold text-base">Project News & Civic Insights</Text>
            </View>

            {/* Civic Impact Insights Box */}
            <View className="mx-4 bg-card rounded-2xl border border-cardBorder p-4 mb-3" style={{ shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 }}>
                
                {/* Tags */}
                {tags && tags.length > 0 && (
                    <View className="flex-row flex-wrap gap-2 mb-3">
                        {tags.map((tag, i) => (
                            <View key={i} className="bg-[#8B5CF6]/10 px-2 py-1 rounded-md border border-[#8B5CF6]/20">
                                <Text className="text-[#8B5CF6] text-[10px] font-bold uppercase tracking-wider">{tag}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Main Highlight */}
                {mainHighlight && (
                    <View className="mb-3">
                        <Text className="text-txt text-lg font-bold leading-6">{mainHighlight}</Text>
                    </View>
                )}

                {/* Bullet Insights */}
                {insights && insights.length > 0 && (
                    <View className="mt-2 border-t border-cardBorder/50 pt-3">
                        {insights.map((insight, idx) => (
                            <View key={idx} className="flex-row items-start mb-2 pr-2">
                                <View className="w-1.5 h-1.5 rounded-full bg-[#00D4AA] mt-2 mr-2" />
                                <Text className="text-txtMuted text-sm leading-5 flex-1">{insight}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {/* Source Articles Accordion */}
            <View className="mx-4">
                <Text className="text-txt text-sm font-bold mb-2">Source Articles</Text>
                {articles.map((article, idx) => {
                    const isExpanded = expandedIndexes.includes(idx);
                    
                    // Format Date
                    let dateStr = article.published_date;
                    try {
                        const d = new Date(article.published_date);
                        if (!isNaN(d)) {
                            dateStr = d.toLocaleDateString('en-IN', { month:'short', day:'numeric', year:'numeric'});
                        }
                    } catch {}

                    return (
                        <View key={idx} className="bg-surface rounded-xl border border-cardBorder mb-2 overflow-hidden">
                            <TouchableOpacity 
                                onPress={() => toggleExpand(idx)}
                                className="p-3 flex-row items-center justify-between"
                                activeOpacity={0.7}
                            >
                                <View className="flex-row items-center flex-1 mr-2">
                                    <View className="w-6 h-6 rounded-md bg-card border border-cardBorder items-center justify-center mr-2">
                                        <Text className="text-txtMuted font-bold text-[10px]">{idx + 1}</Text>
                                    </View>
                                    <Text className="text-txt font-semibold text-sm flex-1" numberOfLines={1}>{article.title}</Text>
                                </View>
                                <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color="#9CA3AF" />
                            </TouchableOpacity>

                            {isExpanded && (
                                <View className="px-3 pb-3 border-t border-cardBorder pt-3">
                                    <View className="flex-row justify-between items-center mb-3">
                                        <View className="bg-main/50 px-2 py-1 rounded border border-cardBorder">
                                            <Text className="text-txtMuted text-xs font-semibold">{article.source || 'News'}</Text>
                                        </View>
                                        <Text className="text-txtMuted text-[11px] font-semibold tracking-wider uppercase">{dateStr}</Text>
                                    </View>

                                    {article.link && (
                                        <TouchableOpacity 
                                            onPress={() => Linking.openURL(article.link).catch(() => {})}
                                            className="flex-row items-center self-end bg-[#8B5CF6]/10 px-3 py-1.5 rounded-lg border border-[#8B5CF6]/20"
                                        >
                                            <Text className="text-[#8B5CF6] font-bold text-xs mr-1">Read Full Article</Text>
                                            <Ionicons name="open-outline" size={14} color="#8B5CF6" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </View>
                    );
                })}
            </View>
        </View>
    );
}
