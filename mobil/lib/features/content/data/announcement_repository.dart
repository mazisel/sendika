import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/announcement.dart';

class AnnouncementRepository {
  AnnouncementRepository(this._client);

  final SupabaseClient _client;

  Future<List<Announcement>> fetchActive({int limit = 20}) async {
    final response = await _client
        .from('announcements')
        .select()
        .eq('is_active', true)
        .order('start_date', ascending: false)
        .limit(limit);

    final items = (response as List<dynamic>)
        .map(
          (item) =>
              Announcement.fromJson(Map<String, dynamic>.from(item as Map)),
        )
        .toList();

    return items;
  }
}
