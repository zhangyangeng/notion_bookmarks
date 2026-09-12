import { getCollections, getLinks } from '@/lib/notion';
import { assertUniqueSlugs, resolveCollectionBySlug } from '@/lib/collection';
import ShareCard from '@/components/share/ShareCard';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 43200;

// 预生成所有公开合集的分享页（ISR 快照），请求时不再打 Notion API。
export async function generateStaticParams() {
  const collections = await getCollections();
  assertUniqueSlugs(collections);
  return collections.filter((c) => c.visible && c.slug).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collections = await getCollections();
  assertUniqueSlugs(collections);
  const collection = collections.find((c) => c.slug === slug && c.visible);
  if (!collection) return { title: '未找到' };
  return {
    title: collection.name,
    description: collection.description || `${collection.name}合集`,
  };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [collections, links] = await Promise.all([getCollections(), getLinks()]);

  assertUniqueSlugs(collections);
  const result = resolveCollectionBySlug(collections, links, slug);

  if (!result) {
    notFound();
  }

  const { collection, links: memberLinks } = result;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            ← 返回导航
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{collection.name}</h1>
          {collection.description && (
            <p className="mt-2 text-muted-foreground">{collection.description}</p>
          )}
        </div>

        {memberLinks.length === 0 ? (
          <p className="text-muted-foreground">这个合集还没有内容。</p>
        ) : (
          <div className="flex flex-col gap-3">
            {memberLinks.map((link) => (
              <ShareCard key={link.id} link={link} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
