import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/branch.dart';

class BranchRepository {
  BranchRepository(this._client);

  final SupabaseClient _client;

  Future<Branch?> fetchByCity(String city) async {
    if (city.trim().isEmpty) {
      return null;
    }
    final response = await _client
        .from('branches')
        .select()
        .ilike('city', city)
        .maybeSingle();

    if (response == null) {
      return null;
    }

    return Branch.fromJson(Map<String, dynamic>.from(response));
  }
}
