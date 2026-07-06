import { useQuery } from '@tanstack/react-query';

export interface LinkPreviewData {
  title?: string;
  description?: string;
  image?: string;
  publisher?: string;
}

export function useLinkPreview(url: string) {
  return useQuery({
    queryKey: ['link-preview', url],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(6000)]);
      const response = await fetch(
        `https://api.microlink.io/?url=${encodeURIComponent(url)}`,
        { signal },
      );
      if (!response.ok) throw new Error('Failed to fetch link preview');
      const json = await response.json();
      if (json.status !== 'success') throw new Error('Failed to fetch link preview');

      const data: LinkPreviewData = {
        title: json.data?.title ?? undefined,
        description: json.data?.description ?? undefined,
        image: json.data?.image?.url ?? json.data?.logo?.url ?? undefined,
        publisher: json.data?.publisher ?? undefined,
      };
      if (!data.title && !data.description && !data.image) {
        throw new Error('No preview data available');
      }
      return data;
    },
    staleTime: 1000 * 60 * 60,
    retry: false,
  });
}
