import * as crypto from 'crypto';

export interface SourceRecord {
    id: string;
    name: string;
    region: string;
    language: string;
    intakeMethod: 'rss' | 'sitemap' | 'scrape';
    url: string;
}

export interface HeadlineRecord {
    id: string;
    sourceId: string;
    title: string;
    url: string;
    publishTime: string;
    ingestTime: string;
}

export interface ArticleRecord extends HeadlineRecord {
    cleanedText: string;
    excerpt: string;
    author: string | null;
}

export interface ComparisonCard {
    sharedFacts: string[];
    sourceDistinctions: Array<{ source: string; point: string }>;
    synthesisSummary: string;
    confidenceNote: string;
}

export interface StoryCluster {
    clusterId: string;
    canonicalLabel: string;
    memberArticles: ArticleRecord[];
    comparison?: ComparisonCard;
    confidenceScore: number;
    topic: string;
}

export const generateId = (text: string) => crypto.createHash('md5').update(text).digest('hex');
