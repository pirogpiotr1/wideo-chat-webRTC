<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Auth;
use DB;

class HomeController extends Controller
{
    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * Show the application dashboard.
     *
     * @return \Illuminate\Contracts\Support\Renderable
     */
    public function index()
    {

        return view('home');
    }

    /** AJAX SZUKAJ POKOJÓW
     * @param Request $request
     */
    public function startListening(Request $request){
        $webRTC = new webRTCController();
        $roomName = $request->input('room_name');


        $room_name = "notifications";
        $url = "https://api2.scaledrone.com/" . CHANNEL_ID. "/rooms";

        $options = array(
            'http' => array(
                'header' => "Content-type: application/json\r\n",
                'method' => 'GET'
            )
        );

        $context = stream_context_create($options);
        $result = file_get_contents($url, false, $context);
        $result = json_decode($result);
        var_dump($result);
        //TO DO -> continue that shit  and make it clear 
        if ($result === FALSE) { /* Handle error */
        }
        else{

        }


        DB::table('users')
            ->where('id', Auth::user()->id)
            ->update(['isListening' => '1']);

        echo json_encode([
            'success' => true
        ]);
    }
}
