import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/member.dart';

class MemberAuthRepository {
  MemberAuthRepository(this._client);

  final SupabaseClient _client;

  Future<Member> login({
    required String tcIdentity,
    required String password,
  }) async {
    final response = await _client.rpc(
      'verify_member_credentials',
      params: {'p_tc_identity': tcIdentity, 'p_password': password},
    );

    if (response == null) {
      throw const AuthException('Geçersiz TC Kimlik veya şifre.');
    }

    if (response is List && response.isNotEmpty) {
      final Map<String, dynamic> row = Map<String, dynamic>.from(
        response.first as Map,
      );
      return Member.fromJson(row);
    }

    if (response is Map && response.isNotEmpty) {
      return Member.fromJson(Map<String, dynamic>.from(response));
    }

    throw const AuthException('Geçersiz TC Kimlik veya şifre.');
  }

  Future<Member> refreshMember(String memberId) async {
    final data = await _client
        .from('members')
        .select()
        .eq('id', memberId)
        .maybeSingle();

    if (data == null) {
      throw const AuthException('Üye bilgileri bulunamadı.');
    }

    return Member.fromJson(Map<String, dynamic>.from(data as Map));
  }
}

class AuthException implements Exception {
  const AuthException(this.message);

  final String message;

  @override
  String toString() => 'AuthException: $message';
}
