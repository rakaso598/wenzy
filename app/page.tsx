"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Heart, Users, Zap } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      {/* 헤더 */}
      <header className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Wenzy
              </h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a
                href="#features"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                기능
              </a>
              <a
                href="#about"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                소개
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
                왠지 당신이
                <br />
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  좋아할 것 같은
                </span>
                <br />
                것들을 보여줍니다
              </h1>

              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                딱히 보고 싶은 게 없어도 괜찮아요.
                <br />
                Wenzy가 당신의 취향을 분석해서
                <span className="font-semibold text-purple-600">
                  왠지 좋아할 것 같은
                </span>
                다양한 콘텐츠를 큐레이션해드릴게요.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/feed">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    지금 시작하기
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </motion.button>
                </Link>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center px-8 py-4 bg-white text-gray-700 font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  데모 보기
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* 배경 장식 */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
      </section>

      {/* 기능 소개 */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              왜 Wenzy인가요?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              기존 추천 서비스와는 다른, 진정한 개인화된 발견의 경험을
              제공합니다
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center p-6"
            >
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                취향 기반 큐레이션
              </h3>
              <p className="text-gray-600">
                당신의 좋아요, 싫어요, 시청 기록을 분석해서 정말 당신이 좋아할
                것 같은 콘텐츠만 선별해드려요.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center p-6"
            >
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-pink-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                협업 필터링
              </h3>
              <p className="text-gray-600">
                비슷한 취향을 가진 사용자들이 좋아하는 콘텐츠도 함께
                추천해드려서 새로운 발견의 기회를 만들어요.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-center p-6"
            >
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                탐험의 재미
              </h3>
              <p className="text-gray-600">
                가끔은 예상 밖의 카테고리에서도 추천해드려서 새로운 관심사를
                발견할 수 있는 기회를 만들어요.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 소개 섹션 */}
      <section
        id="about"
        className="py-20 bg-gradient-to-br from-purple-50 to-pink-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                "왠지" 좋아할 것 같은
                <br />
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  AI 큐레이션
                </span>
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Wenzy는 단순한 추천이 아닙니다. 당신의 행동 패턴을 깊이 분석해서
                정말로 당신이 좋아할 것 같은 콘텐츠를 찾아드리는 AI 큐레이션
                서비스예요.
              </p>
              <p className="text-lg text-gray-600 mb-8">
                유튜브, 블로그, 뉴스, 소셜미디어 등 다양한 소스에서 당신만을
                위한 맞춤형 콘텐츠를 선별해드려요.
              </p>

              <Link href="/feed">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  지금 체험해보기
                  <ArrowRight className="w-5 h-5 ml-2" />
                </motion.button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm text-purple-700">
                      💡 당신이 좋아하는 테크 카테고리의 최신 동영상입니다
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">Wenzy</h3>
            <p className="text-gray-400 mb-6">
              왠지 당신이 좋아할 것 같은 것들을 보여주는 AI 큐레이션 서비스
            </p>
            <div className="flex justify-center space-x-6">
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors"
              >
                이용약관
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors"
              >
                개인정보처리방침
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors"
              >
                문의하기
              </a>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
