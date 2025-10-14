import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/announcement_repository.dart';
import '../data/news_repository.dart';
import '../domain/announcement.dart';
import '../domain/news_item.dart';

final newsRepositoryProvider = Provider<NewsRepository>((ref) {
  return NewsRepository(ref.watch(supabaseClientProvider));
});

final announcementsRepositoryProvider = Provider<AnnouncementRepository>((ref) {
  return AnnouncementRepository(ref.watch(supabaseClientProvider));
});

final newsFutureProvider = FutureProvider.autoDispose<List<NewsItem>>((ref) {
  return ref.watch(newsRepositoryProvider).fetchLatest();
});

final announcementsFutureProvider =
    FutureProvider.autoDispose<List<Announcement>>((ref) {
      return ref.watch(announcementsRepositoryProvider).fetchActive();
    });
