import * as crypto from 'node:crypto';

export interface SourceRecord {
    source_id: string;
    name: string;
    region: string;
    language: string;
    intake_method: 'rss' | 'sitemap' | 'scrape';
    base_url: string;
    active: boolean;
    priority: number;
    notes?: string;
}

export interface HeadlineRecord {
    headline_id: string;
    source_id: string;
    title: string;
    url: string;
    canonical_url: string;
    section: string | null;
    published_at: string | null;
    ingested_at: string;
    seen_before: boolean;
    extraction_status: 'pending' | 'success' | 'failed';
    hash: string;
    region_tag: string; // Sentinel Spec v1.0 extra
}

export interface ArticleRecord {
    article_id: string;
    headline_id: string;
    source_id: string;
    title: string;
    url: string;
    canonical_url: string;
    author: string | null;
    published_at: string | null;
    extracted_at: string;
    excerpt: string;
    body_text: string;
    content_length: number;
    language: string;
    entities: string[];
    geography: string[];
    extraction_status: 'success' | 'failed';
    extraction_error: string | null;
    region_tag: string;
}

export interface ClusterObject {
    cluster_id: string;
    topic_label: string;
    event_window_start: string;
    event_window_end: string;
    article_ids: string[];
    source_ids: string[];
    article_count: number;
    source_count: number;
    qualification_status: 'qualified' | 'rejected' | 'pending';
    qualification_score: number;
    primary_geography: string | null;
    topic_type: string | null;
    created_at: string;
    updated_at: string;
    region_tag: string;

    // UI helper fields (Synthesis integration)
    shared_facts?: string[];
    source_differences?: string[];
    synthesis?: string;
    confidence?: string;
    sources?: Array<{ id: string; url: string; source: string; title: string }>;
}

export interface SynthesisObject {
    synthesis_id: string;
    cluster_id: string;
    prompt_version: string;
    generated_at: string;
    selected_article_ids: string[];
    shared_facts: string[];
    source_differences: string[];
    neutral_summary: string;
    confidence_status: string;
    reused_from_cache: boolean;
}

export const generateId = (text: string) => crypto.createHash('md5').update(text).digest('hex');
