import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../widgets/news_card.dart';
import '../../../content/providers/content_providers.dart';

class NewsPage extends ConsumerWidget {
  const NewsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final newsAsync = ref.watch(newsFutureProvider);

    return newsAsync.when(
      data: (items) => RefreshIndicator(
        onRefresh: () => ref.refresh(newsFutureProvider.future),
        child: items.isEmpty
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(height: 120),
                  Center(child: Text('Yayınlanmış haber bulunmuyor.')),
                ],
              )
            : ListView.builder(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 16,
                ),
                physics: const AlwaysScrollableScrollPhysics(),
                itemCount: items.length,
                itemBuilder: (context, index) {
                  return NewsCard(item: items[index]);
                },
              ),
      ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 120),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              children: [
                const Icon(Icons.error_outline, size: 48),
                const SizedBox(height: 12),
                Text(
                  'Haberler yüklenemedi.\n${error.toString()}',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => ref.refresh(newsFutureProvider),
                  child: const Text('Tekrar dene'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
