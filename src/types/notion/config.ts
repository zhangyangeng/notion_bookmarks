import {
    PageObjectResponse,
    TitlePropertyItemObjectResponse,
    RichTextPropertyItemObjectResponse
} from "@notionhq/client/build/src/api-endpoints";
import { isPageObjectResponse, extractTitle, extractRichText } from "./common";

// Notion Properties for Config Database
export interface NotionConfigProperties {
    Name: TitlePropertyItemObjectResponse;
    Value: RichTextPropertyItemObjectResponse;
}

// Domain Model
export interface WebsiteConfig {
    [key: string]: string;
}

// Type Guard
export function isNotionConfigPage(
    page: unknown
): page is PageObjectResponse & { properties: NotionConfigProperties } {
    if (!isPageObjectResponse(page)) return false;
    const props = page.properties;
    return 'Name' in props && 'Value' in props;
}

// Extractor (Config is a bit different, it maps rows to a dictionary)
export function getConfigItem(page: PageObjectResponse & { properties: NotionConfigProperties }): { key: string, value: string } | null {
    const key = extractTitle(page.properties.Name);
    const value = extractRichText(page.properties.Value);
    if (!key) return null;
    return { key: key.toUpperCase(), value };
}
