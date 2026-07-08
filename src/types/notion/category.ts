import {
    PageObjectResponse,
    TitlePropertyItemObjectResponse,
    RichTextPropertyItemObjectResponse,
    NumberPropertyItemObjectResponse,
    CheckboxPropertyItemObjectResponse
} from "@notionhq/client/build/src/api-endpoints";
import { isPageObjectResponse, extractTitle, extractRichText } from "./common";

// Notion Properties for Category Database
export interface NotionCategoryProperties {
    Name: TitlePropertyItemObjectResponse;
    IconName: RichTextPropertyItemObjectResponse;
    Order: NumberPropertyItemObjectResponse;
    Enabled: CheckboxPropertyItemObjectResponse;
}

// Domain Model
export interface Category {
    id: string;
    name: string;
    iconName: string;
    order: number;
    enabled: boolean;
    subCategories?: {
        id: string;
        name: string;
    }[];
}

// Type Guard
export function isNotionCategoryPage(
    page: unknown
): page is PageObjectResponse & { properties: NotionCategoryProperties } {
    if (!isPageObjectResponse(page)) return false;
    const props = page.properties;
    return 'Name' in props && 'IconName' in props && 'Order' in props && 'Enabled' in props;
}

// Transformer
export function toCategory(page: PageObjectResponse & { properties: NotionCategoryProperties }): Category {
    const props = page.properties;
    return {
        id: page.id,
        name: extractTitle(props.Name),
        iconName: extractRichText(props.IconName),
        order: props.Order.number || 0,
        enabled: props.Enabled.checkbox,
    };
}
