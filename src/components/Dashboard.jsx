import React from "react";
// 터미널에서 설치 필요: npm install lucide-react
import { BookOpen, MessageSquare, Mic } from "lucide-react";

export default function Dashboard({ onNavigate }) {
  // 카드 데이터 배열 (중복 코드 제거용)
  const menuItems = [
    {
      id: "flashcard",
      title: "Flashcard",
      desc: "Learn new words with flashcards",
      icon: <BookOpen className="w-8 h-8 text-lime-600" />,
    },
    {
      id: "quiz",
      title: "Word Quiz",
      desc: "Test your vocabulary knowledge",
      icon: <MessageSquare className="w-8 h-8 text-lime-600" />,
    },
    {
      id: "speaking",
      title: "Speaking",
      desc: "Practice pronunciation skills",
      icon: <Mic className="w-8 h-8 text-lime-600" />,
    },
  ];

  return (
    <div className="min-h-screen bg-lime-50 flex flex-col items-center justify-center p-8 font-['Inter']">
      {/* 헤더 섹션 */}
      <div className="text-center mb-12">
        <h1 className="text-gray-800 text-4xl font-semibold mb-3">
          English Learning
        </h1>
        <p className="text-gray-500 text-lg">Choose your learning mode</p>
      </div>

      {/* 카드 그리드 섹션 */}
      {/* gap-6: 적당한 간격, flex-wrap: 화면 작으면 줄바꿈 */}
      <div className="flex flex-wrap justify-center gap-6 w-full max-w-4xl">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)} // 클릭 시 모드 변경
            className="
              bg-white p-8 rounded-2xl shadow-sm border border-transparent
              w-64 flex flex-col items-center gap-6
              transition-all duration-300
              hover:shadow-lg hover:-translate-y-1 hover:border-lime-200
              active:scale-95
            "
          >
            {/* 아이콘 영역 (배경 원형 추가로 더 예쁘게) */}
            <div className="p-4 bg-lime-50 rounded-full">{item.icon}</div>

            {/* 텍스트 영역 */}
            <div className="text-center">
              <h2 className="text-gray-800 text-2xl font-semibold mb-2">
                {item.title}
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                {item.desc}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
