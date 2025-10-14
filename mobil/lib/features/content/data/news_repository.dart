import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/news_item.dart';

class NewsRepository {
  NewsRepository(this._client);

  final SupabaseClient _client;

  Future<List<NewsItem>> fetchLatest({int limit = 20}) async {
    final response = await _client
        .from('news')
        .select()
        .eq('is_published', true)
        .order('published_at', ascending: false)
        .limit(limit);

    final items = (response as List<dynamic>)
        .map(
          (item) => NewsItem.fromJson(Map<String, dynamic>.from(item as Map)),
        )
        .toList();

    return items;
  }
}
